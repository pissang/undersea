uniform sampler2D colorTexture;

uniform sampler2D gBufferTexture2;

uniform mat4 projectionInv;
uniform mat4 viewInv;

uniform vec3 sceneColor: [1, 1, 1];

// from 0.0 to 1.0
uniform float fogDensity: 0.2;
uniform vec3 fogColor0: [0.3, 0.3, 0.3];
uniform vec3 fogColor1: [0.1, 0.1, 0.1];

uniform vec3 eyePosition: [0.0, 0.0, 0.0];

// TODO
uniform float range: 40.0;

varying vec2 v_Texcoord;

#define LOG2 1.442695

@import qtek.util.rgbm

void main()
{
    float depth = texture2D(gBufferTexture2, v_Texcoord).r * 2.0 - 1.0;

    vec2 xy = v_Texcoord * 2.0 - 1.0;
    vec4 projectedPos = vec4(xy, depth, 1.0);
    vec4 p4 = projectionInv * projectedPos;

    vec3 viewPosition = p4.xyz / p4.w;
    // Range based fog http://in2gpu.com/2014/07/22/create-fog-shader/
    float distance = length(viewPosition) / range;

    vec4 worldPosition = viewInv * vec4(viewPosition, 1.0);

    vec3 fogColor = mix(fogColor1, fogColor0, clamp(normalize(worldPosition.xyz - eyePosition).y, 0.0, 1.0));

    vec3 color = decodeHDR(texture2D(colorTexture, v_Texcoord)).rgb;
    gl_FragColor.rgb = mix(
         fogColor, color, clamp(exp2(-fogDensity * fogDensity * distance * distance * LOG2), 0.0, 1.0)
    ) // Simply use sceneColor to tint the color
    * sceneColor;

    gl_FragColor.a = 1.0;
}