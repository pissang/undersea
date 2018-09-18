export default `
@export lightshaft.mask
uniform sampler2D colorTexture;

uniform sampler2D gBufferTexture2;

uniform mat4 viewProjectionInv;

uniform vec3 boxMin;
uniform vec3 boxMax;

varying vec2 v_Texcoord;

void main () {

    float depth = texture2D(gBufferTexture2, v_Texcoord).r * 2.0 - 1.0;

    vec2 xy = v_Texcoord * 2.0 - 1.0;
    vec4 projectedPos = vec4(xy, depth, 1.0);
    vec4 p4 = viewProjectionInv * projectedPos;

    vec3 viewPosition = p4.xyz / p4.w;

    if(all(greaterThan(viewPosition, boxMin)) && all(lessThan(viewPosition, boxMax))) {
        gl_FragColor = texture2D(colorTexture, v_Texcoord);
    }
    else {
        discard;
    }

}
@end

@export lightshaft.blur
// http://bkcore.com/blog/3d/webgl-three-js-volumetric-light-godrays.html
#define SAMPLE_COUNT 40

uniform sampler2D maskTexture;
uniform vec2 lightPositionScreen;

uniform vec2 textureSize;
uniform float decay : 0.94;

varying vec2 v_Texcoord;

void main()
{
    vec2 dir = lightPositionScreen - v_Texcoord;

    vec3 color;
    for (int i = 0; i < SAMPLE_COUNT; i++) {

    }
}
@end

@export lightshaft.blend
@end
`;