@export waterplane.vertex

uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;
uniform mat4 worldInverseTranspose : WORLDINVERSETRANSPOSE;
uniform mat4 world : WORLD;

uniform vec2 uvRepeat : [1.0, 1.0];
uniform vec2 uvOffset : [0.0, 0.0];

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

uniform float reflectivity : 0.5;
uniform float time;

vec4 getNoise( vec2 uv )
{
	vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);
	vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );
	vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
	vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
	vec4 noise = texture2D( normalMap, uv0 ) +
		texture2D( normalMap, uv1 ) +
		texture2D( normalMap, uv2 ) +
		texture2D( normalMap, uv3 );
	return noise * 0.5 - 1.0;
}

void main()
{
    vec4 finalColor = vec4(color, alpha);

    vec3 eyePos = viewInverse[3].xyz;
    vec3 viewDirection = normalize(eyePos - v_WorldPosition);

    vec3 normal = v_Normal;
#ifdef NORMALMAP_ENABLED
    normal = normalize(getNoise(v_WorldPosition.xz * 6.0).xyz * vec3( 1.5, 1.0, 1.5 ) );
#endif

#ifdef ENVIRONMENTMAP_ENABLED
    vec3 envTexel = textureCube(environmentMap, reflect(-viewDirection, normal)).xyz;
    finalColor.rgb = finalColor.rgb + envTexel * reflectivity;
#endif

    gl_FragColor = finalColor;
}

@end