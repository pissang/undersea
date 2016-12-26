
@import qtek.deferred.chunk.light_head

@import qtek.deferred.chunk.light_equation

uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 eyePosition;

uniform mat4 lightViewMatrix;

uniform sampler2D causticsTexture;
uniform float causticsIntensity : 1.0;
uniform float causticsScale : 4;

uniform vec3 ambientColor: [1, 1, 1];

uniform float time: 0;

// Motion_4WayChaos from Unreal Engine
// https://www.youtube.com/watch?v=W8u7GONZzoY 16:57
vec4 Motion_4WayChaos(sampler2D inputTexture, vec2 coord, float speed) {
    vec4 tex1 = texture2D(inputTexture, coord + speed * vec2(0.1, 0.1) * time);
    vec4 tex2 = texture2D(inputTexture, coord + vec2(0.418, 0.355) + speed * vec2(-0.1, 0.1) * time);
    vec4 tex3 = texture2D(inputTexture, coord + vec2(0.865, 0.148) + speed * vec2(0.1, -0.1) * time);
    vec4 tex4 = texture2D(inputTexture, coord + vec2(0.651, 0.752) + speed * vec2(-0.1, -0.1) * time);

    return (tex1 + tex2 + tex3 + tex4) * 0.3;
}

void main()
{
    @import qtek.deferred.chunk.gbuffer_read

    vec4 positionInLightSpace = lightViewMatrix * vec4(position, 1.0);
    positionInLightSpace.xyz /= positionInLightSpace.w;
    vec2 causticsUv = positionInLightSpace.xz;
    causticsUv *= 1.0 / 64.0 / causticsScale;

    causticsUv += time * 0.02;

    vec3 causticsAffector = Motion_4WayChaos(causticsTexture, causticsUv, 0.5).rgb
        * causticsIntensity;

    vec3 L = -normalize(lightDirection);
    vec3 V = normalize(eyePosition - position);

    vec3 H = normalize(L + V);
    float ndl = clamp(dot(N, L), 0.0, 1.0);
    float ndh = clamp(dot(N, H), 0.0, 1.0);
    float ndv = clamp(dot(N, V), 0.0, 1.0);

    gl_FragColor.rgb = lightEquation(
        lightColor * causticsAffector, diffuseColor, specularColor, ndl, ndh, ndv, glossiness
    );

    gl_FragColor.rgb += (clamp(dot(N, vec3(0.0, 1.0, 0.0)), 0.0, 1.0) * 0.5 + 0.5) * ambientColor * diffuseColor;

    gl_FragColor.a = 1.0;
}