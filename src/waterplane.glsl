export default `
@export waterplane.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;
uniform mat4 worldInverseTranspose : WORLDINVERSETRANSPOSE;
uniform mat4 world : WORLD;

uniform vec2 uvRepeat = vec2(1.0, 1.0);
uniform vec2 uvOffset = vec2(0.0, 0.0);

attribute vec3 position : POSITION;
attribute vec2 texcoord : TEXCOORD_0;
attribute vec3 normal : NORMAL;

varying vec2 v_Texcoord;
varying vec3 v_Normal;
varying vec3 v_WorldPosition;


void main()
{

    gl_Position = worldViewProjection * vec4(position, 1.0);

    v_Texcoord = texcoord * uvRepeat + uvOffset;
    v_WorldPosition = (world * vec4(position, 1.0)).xyz;

    v_Normal = normalize((worldInverseTranspose * vec4(normal, 0.0)).xyz);

}

@end

@export waterplane.fragment

#define LOG2 1.442695

uniform mat4 viewInverse : VIEWINVERSE;

varying vec2 v_Texcoord;
varying vec3 v_Normal;
varying vec3 v_WorldPosition;

#ifdef NORMALMAP_ENABLED
uniform sampler2D normalMap;
#endif

#ifdef ENVIRONMENTMAP_ENABLED
uniform samplerCube environmentMap;
#endif

uniform vec3 color : [1.0, 1.0, 1.0];
uniform float alpha : 1.0;

uniform float reflectivity : 0.8;
uniform float elapsedTime;

uniform float fogDensity = 0.2;
uniform vec3 fogColor0 = vec3(0.3, 0.3, 0.3);
uniform vec3 fogColor1 = vec3(0.1, 0.1, 0.1);

uniform vec3 sceneColor = vec3(1, 1, 1);
// TODO
uniform float fogRange = 4.0;

vec4 getNoise(vec2 uv)
{
	vec2 uv0 = (uv / 103.0) + vec2(elapsedTime / 17.0, elapsedTime / 29.0);
	vec2 uv1 = uv / 107.0-vec2( elapsedTime / -19.0, elapsedTime / 31.0 );
	vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( elapsedTime / 101.0, elapsedTime / 97.0 );
	vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( elapsedTime / 109.0, elapsedTime / -113.0 );
	vec4 noise = texture2D(normalMap, uv0) +
		texture2D(normalMap, uv1) +
		texture2D(normalMap, uv2) +
		texture2D(normalMap, uv3);
	return noise * 0.5 - 1.0;
}

void main()
{
    vec4 outColor = vec4(color, alpha);

    vec3 eyePos = viewInverse[3].xyz;
    vec3 viewDirection = normalize(eyePos - v_WorldPosition);

    vec3 normal = v_Normal;
#ifdef NORMALMAP_ENABLED
    normal = normalize(getNoise(v_WorldPosition.xz * 6.0).xyz * vec3( 1.5, 1.0, 1.5 ) );
#endif

#ifdef ENVIRONMENTMAP_ENABLED
    vec3 envTexel = textureCube(environmentMap, reflect(-viewDirection, normal)).xyz;
    outColor.rgb = outColor.rgb + envTexel * reflectivity;
#endif

    if (fogRange > 0.0) {
        vec3 fogColor = mix(fogColor1, fogColor0, clamp(normalize(v_WorldPosition.xyz - eyePos).y, 0.0, 1.0));

        float eyeDist = length(v_WorldPosition.xyz - eyePos) / fogRange;
        outColor.rgb = mix(
            fogColor, outColor.rgb, clamp(exp2(-fogDensity * fogDensity * eyeDist * eyeDist * LOG2), 0.0, 1.0)
        ) // Simply use sceneColor to tint the color
        * sceneColor;
    }

    gl_FragColor = vec4(outColor.rgb, 1.0);
}

@end
`;