
// http://blog.selfshadow.com/publications/s2013-shading-course/

@export forward_caustics.vertex

@import qtek.phong.vertex

@end


@export forward_caustics.fragment

#define PI 3.14159265358979

#define GLOSS_CHANEL 0
#define ROUGHNESS_CHANEL 0
#define METALNESS_CHANEL 1

uniform mat4 viewInverse : VIEWINVERSE;

varying vec2 v_Texcoord;
varying vec3 v_Normal;
varying vec3 v_WorldPosition;

#ifdef NORMALMAP_ENABLED
varying vec3 v_Tangent;
varying vec3 v_Bitangent;
uniform sampler2D normalMap;
#endif

#ifdef DIFFUSEMAP_ENABLED
uniform sampler2D diffuseMap;
#endif

#ifdef SPECULARMAP_ENABLED
uniform sampler2D specularMap;
#endif

// I don't know why rougnessMap must be put before environmentMap. Or it will be wrong.
#ifdef USE_ROUGHNESS
uniform float roughness : 0.5;
    #ifdef ROUGHNESSMAP_ENABLED
uniform sampler2D roughnessMap;
    #endif
#else
uniform float glossiness: 0.5;
    #ifdef GLOSSMAP_ENABLED
uniform sampler2D glossMap;
    #endif
#endif

#ifdef METALNESSMAP_ENABLED
uniform sampler2D metalnessMap;
#endif

#ifdef ENVIRONMENTMAP_ENABLED
uniform samplerCube environmentMap;

// https://seblagarde.wordpress.com/2012/09/29/image-based-lighting-approaches-and-parallax-corrected-cubemap/
    #ifdef PARALLAX_CORRECTED
uniform vec3 environmentBoxMin;
uniform vec3 environmentBoxMax;
    #endif

#endif

#ifdef BRDFLOOKUP_ENABLED
uniform sampler2D brdfLookup;
#endif

#ifdef EMISSIVEMAP_ENABLED
uniform sampler2D emissiveMap;
#endif

#ifdef SSAOMAP_ENABLED
// For ssao prepass
uniform sampler2D ssaoMap;
uniform vec2 viewportSize : VIEWPORT_SIZE;
#endif

uniform vec3 color : [1.0, 1.0, 1.0];
uniform float alpha : 1.0;


#ifdef USE_METALNESS
// metalness workflow
uniform float metalness : 0.0;
#else
// specular workflow
uniform vec3 specularColor : [0.1, 0.1, 0.1];
#endif

uniform vec3 emission : [0.0, 0.0, 0.0];

uniform float emissionIntensity: 1;

// For selection
uniform vec3 mixColor: [1.0, 1.0, 0.0];
uniform float mixIntensity: 0.0;

// Max mipmap level of environment map
#ifdef ENVIRONMENTMAP_PREFILTER
uniform float maxMipmapLevel: 5;
#endif

#ifdef AMBIENT_LIGHT_COUNT
@import qtek.header.ambient_light
#endif

#ifdef AMBIENT_SH_LIGHT_COUNT
@import qtek.header.ambient_sh_light
#endif

#ifdef POINT_LIGHT_COUNT
@import qtek.header.point_light
#endif
#ifdef DIRECTIONAL_LIGHT_COUNT
@import qtek.header.directional_light
#endif
#ifdef SPOT_LIGHT_COUNT
@import qtek.header.spot_light
#endif

// Import util functions and uniforms needed
@import qtek.util.calculate_attenuation

@import qtek.util.edge_factor

@import qtek.util.rgbm

@import qtek.util.srgb

@import qtek.plugin.compute_shadow_map

@import qtek.util.parallax_correct


float G_Smith(float g, float ndv, float ndl)
{
    // float k = (roughness+1.0) * (roughness+1.0) * 0.125;
    float roughness = 1.0 - g;
    float k = roughness * roughness / 2.0;
    float G1V = ndv / (ndv * (1.0 - k) + k);
    float G1L = ndl / (ndl * (1.0 - k) + k);
    return G1L * G1V;
}
// Fresnel
vec3 F_Schlick(float ndv, vec3 spec) {
    return spec + (1.0 - spec) * pow(1.0 - ndv, 5.0);
}

float D_Phong(float g, float ndh) {
    // from black ops 2
    float a = pow(8192.0, g);
    return (a + 2.0) / 8.0 * pow(ndh, a);
}

float D_GGX(float g, float ndh) {
    float r = 1.0 - g;
    float a = r * r;
    float tmp = ndh * ndh * (a - 1.0) + 1.0;
    return a / (PI * tmp * tmp);
}


void main()
{
    vec4 outColor = vec4(color, alpha);
    vec3 eyePos = viewInverse[3].xyz;
    vec3 V = normalize(eyePos - v_WorldPosition);

#ifdef DIFFUSEMAP_ENABLED
    vec4 tex = texture2D(diffuseMap, v_Texcoord);
    #ifdef SRGB_DECODE
    tex = sRGBToLinear(tex);
    #endif
    outColor.rgb *= tex.rgb;
    #ifdef DIFFUSEMAP_ALPHA_ALPHA
    outColor.a *= tex.a;
    #endif
#endif


#ifdef USE_METALNESS
    float m = metalness;

    #ifdef METALNESSMAP_ENABLED
    float m2 = texture2D(metalnessMap, v_Texcoord)[METALNESS_CHANEL];
    // Adjust the brightness
    m = clamp(m2 + (m - 0.5) * 2.0, 0.0, 1.0);
    #endif

    vec3 baseColor = outColor.rgb;
    outColor.rgb = baseColor * (1.0 - m);
    vec3 spec = mix(vec3(0.04), baseColor, m);
#else
    vec3 spec = specularColor;
#endif

#ifdef USE_ROUGHNESS
    float g = 1.0 - roughness;
    #ifdef ROUGHNESSMAP_ENABLED
    float g2 = 1.0 - texture2D(roughnessMap, v_Texcoord)[ROUGHNESS_CHANEL];
    // Adjust the brightness
    g = clamp(g2 + (g - 0.5) * 2.0, 0.0, 1.0);
    #endif
#else
    float g = glossiness;
    #ifdef GLOSSMAP_ENABLED
    float g2 = texture2D(glossMap, v_Texcoord)[GLOSS_CHANEL];
    // Adjust the brightness
    g = clamp(g2 + (g - 0.5) * 2.0, 0.0, 1.0);
    #endif
#endif

#ifdef SPECULARMAP_ENABLED
    spec *= texture2D(specularMap, v_Texcoord).rgb;
#endif

    vec3 N = v_Normal;
#ifdef NORMALMAP_ENABLED
    if (dot(v_Tangent, v_Tangent) > 0.0) {
        vec3 normalTexel = texture2D(normalMap, v_Texcoord).xyz;
        if (dot(normalTexel, normalTexel) > 0.0) { // Valid normal map
            N = normalTexel * 2.0 - 1.0;
            mat3 tbn = mat3(v_Tangent, v_Bitangent, v_Normal);
            // FIXME Why need to normalize again?
            N = normalize(tbn * N);
        }
    }
#endif

    // Diffuse part of all lights
    vec3 diffuseTerm = vec3(0.0, 0.0, 0.0);
    // Specular part of all lights
    vec3 specularTerm = vec3(0.0, 0.0, 0.0);

    float ndv = clamp(dot(N, V), 0.0, 1.0);
    vec3 fresnelTerm = F_Schlick(ndv, spec);

#ifdef AMBIENT_LIGHT_COUNT
    for(int i = 0; i < AMBIENT_LIGHT_COUNT; i++)
    {
        diffuseTerm += ambientLightColor[i];
    }
#endif

#ifdef AMBIENT_SH_LIGHT_COUNT
    for(int i = 0; i < AMBIENT_SH_LIGHT_COUNT; i++)
    {
        diffuseTerm += calcAmbientSHLight(i, N) * ambientSHLightColor[i];
    }
#endif

#ifdef POINT_LIGHT_COUNT
#if defined(POINT_LIGHT_SHADOWMAP_COUNT)
    float shadowContribsPoint[POINT_LIGHT_COUNT];
    if(shadowEnabled)
    {
        computeShadowOfPointLights(v_WorldPosition, shadowContribsPoint);
    }
#endif
    for(int i = 0; i < POINT_LIGHT_COUNT; i++)
    {

        vec3 lightPosition = pointLightPosition[i];
        vec3 lc = pointLightColor[i];
        float range = pointLightRange[i];

        vec3 L = lightPosition - v_WorldPosition;

        // Calculate point light attenuation
        float dist = length(L);
        float attenuation = lightAttenuation(dist, range);
        L /= dist;
        vec3 H = normalize(L + V);
        float ndl = clamp(dot(N, L), 0.0, 1.0);
        float ndh = clamp(dot(N, H), 0.0, 1.0);

        float shadowContrib = 1.0;
#if defined(POINT_LIGHT_SHADOWMAP_COUNT)
        if(shadowEnabled)
        {
            shadowContrib = shadowContribsPoint[i];
        }
#endif

        vec3 li = lc * ndl * attenuation * shadowContrib;
        diffuseTerm += li;
        specularTerm += li * fresnelTerm * D_Phong(g, ndh);
    }
#endif

#ifdef DIRECTIONAL_LIGHT_COUNT
#if defined(DIRECTIONAL_LIGHT_SHADOWMAP_COUNT)
    float shadowContribsDir[DIRECTIONAL_LIGHT_COUNT];
    if(shadowEnabled)
    {
        computeShadowOfDirectionalLights(v_WorldPosition, shadowContribsDir);
    }
#endif
    for(int i = 0; i < DIRECTIONAL_LIGHT_COUNT; i++)
    {

        vec3 L = -normalize(directionalLightDirection[i]);
        vec3 lc = directionalLightColor[i];

        vec3 H = normalize(L + V);
        float ndl = clamp(dot(N, L), 0.0, 1.0);
        float ndh = clamp(dot(N, H), 0.0, 1.0);

        float shadowContrib = 1.0;
#if defined(DIRECTIONAL_LIGHT_SHADOWMAP_COUNT)
        if(shadowEnabled)
        {
            shadowContrib = shadowContribsDir[i];
        }
#endif

        vec3 li = lc * ndl * shadowContrib;

        diffuseTerm += li;
        specularTerm += li * fresnelTerm * D_Phong(g, ndh);
    }
#endif

#ifdef SPOT_LIGHT_COUNT
#if defined(SPOT_LIGHT_SHADOWMAP_COUNT)
    float shadowContribsSpot[SPOT_LIGHT_COUNT];
    if(shadowEnabled)
    {
        computeShadowOfSpotLights(v_WorldPosition, shadowContribsSpot);
    }
#endif
    for(int i = 0; i < SPOT_LIGHT_COUNT; i++)
    {
        vec3 lightPosition = spotLightPosition[i];
        vec3 spotLightDirection = -normalize(spotLightDirection[i]);
        vec3 lc = spotLightColor[i];
        float range = spotLightRange[i];
        float a = spotLightUmbraAngleCosine[i];
        float b = spotLightPenumbraAngleCosine[i];
        float falloffFactor = spotLightFalloffFactor[i];

        vec3 L = lightPosition - v_WorldPosition;
        // Calculate attenuation
        float dist = length(L);
        float attenuation = lightAttenuation(dist, range);

        // Normalize light direction
        L /= dist;
        // Calculate spot light fall off
        float c = dot(spotLightDirection, L);

        float falloff;
        // Fomular from real-time-rendering
        falloff = clamp((c - a) /( b - a), 0.0, 1.0);
        falloff = pow(falloff, falloffFactor);

        vec3 H = normalize(L + V);
        float ndl = clamp(dot(N, L), 0.0, 1.0);
        float ndh = clamp(dot(N, H), 0.0, 1.0);

        float shadowContrib = 1.0;
#if defined(SPOT_LIGHT_SHADOWMAP_COUNT)
        if (shadowEnabled)
        {
            shadowContrib = shadowContribsSpot[i];
        }
#endif

        vec3 li = lc * attenuation * (1.0 - falloff) * shadowContrib * ndl;

        diffuseTerm += li;
        specularTerm += li * fresnelTerm * D_Phong(g, ndh);
    }
#endif

    outColor.rgb *= diffuseTerm;

    outColor.rgb += specularTerm;


#ifdef ENVIRONMENTMAP_ENABLED

    vec3 envWeight = g * fresnelTerm;
    vec3 L = reflect(-V, N);

    #ifdef PARALLAX_CORRECTED
    L = parallaxCorrect(L, v_WorldPosition, environmentBoxMin, environmentBoxMax);
    #endif

    #ifdef ENVIRONMENTMAP_PREFILTER
    // FIXME simply 1 minus roughness ?
    float rough = clamp(1.0 - g, 0.0, 1.0);
    float bias = rough * maxMipmapLevel;
    // Only env map can have HDR
    vec3 envTexel = decodeHDR(textureCubeLodEXT(environmentMap, L, bias)).rgb;

        #ifdef BRDFLOOKUP_ENABLED
    vec2 brdfParam = texture2D(brdfLookup, vec2(rough, ndv)).xy;
    envWeight = spec * brdfParam.x + brdfParam.y;
        #endif

    #else
    vec3 envTexel = textureCube(environmentMap, L).xyz;
    #endif

    outColor.rgb += envTexel * envWeight;
#endif

#ifdef SSAOMAP_ENABLED
    outColor.rgb *= texture2D(ssaoMap, gl_FragCoord.xy / viewportSize).rgb;
#endif

    vec3 lEmission = emission;
#ifdef EMISSIVEMAP_ENABLED
    lEmission *= texture2D(emissiveMap, v_Texcoord);
#endif
    outColor.rgb += lEmission * emissionIntensity;

#ifdef GAMMA_ENCODE
    // Not linear
    outColor.rgb = pow(outColor.rgb, vec3(1 / 2.2));
#endif

    outColor.rgb = mix(outColor.rgb, mixColor, mixIntensity);

    if(lineWidth > 0.)
    {
        outColor.rgb = mix(lineColor, vec3(outColor.rgb), edgeFactor(lineWidth));
    }

    gl_FragColor = encodeHDR(outColor);
}

@end
