
@export undersea.blur_common
vec4 doBlur(vec2 offset) {

    @import qtek.compositor.kernel.gaussian_13

    vec4 sum = vec4(0.0);
    float weightAll = 0.0;

    float depth = texture2D(gBufferTexture2, v_Texcoord).r * 2.0 - 1.0;

    vec2 xy = v_Texcoord * 2.0 - 1.0;
    vec4 projectedPos = vec4(xy, depth, 1.0);
    vec4 p4 = projectionInv * projectedPos;

    vec3 position = p4.xyz / p4.w;
    float distance = length(position);

    offset *= clamp(smoothstep(blurNear, blurFar, distance), 0.0, 1.0);
    // blur in y (vertical)
    for (int i = 0; i < 13; i++) {
        vec2 coord = clamp(v_Texcoord + float(i - 6) * offset, vec2(0.0), vec2(1.0));
        float w = gaussianKernel[i];
        sum += decodeHDR(texture2D(texture, coord)) * w;
        weightAll += w;
    }

    return encodeHDR(sum / weightAll);
}
@end

@export undersea.blur_h

uniform sampler2D texture;
// Depth texture
uniform sampler2D gBufferTexture2;
varying vec2 v_Texcoord;

uniform float blurSize : 2.0;
uniform vec2 textureSize : [512.0, 512.0];


uniform mat4 projectionInv;
// TODO
uniform float blurNear: 120.0;
uniform float blurFar: 200.0;

@import qtek.compositor.util.sample

@import undersea.blur_common

void main (void)
{
    vec2 off = blurSize / textureSize;
    off.y = 0.0;

    gl_FragColor = doBlur(off);
}

@end

@export undersea.blur_v

uniform sampler2D texture;
// Depth texture
uniform sampler2D gBufferTexture2;
varying vec2 v_Texcoord;

uniform float blurSize : 2.0;
uniform vec2 textureSize : [512.0, 512.0];


uniform mat4 projectionInv;
// TODO
uniform float blurNear: 120.0;
uniform float blurFar: 200.0;

@import qtek.compositor.util.sample

@import undersea.blur_common

void main(void)
{
    @import qtek.compositor.kernel.gaussian_13

    vec2 off = blurSize / textureSize;
    off.x = 0.0;

    gl_FragColor = doBlur(off);
}

@end