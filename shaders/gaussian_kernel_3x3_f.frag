#version 460

layout(set = 0, binding = 0) uniform sampler2D textureToBlur;

layout(location = 0) in vec2 fragUV;
layout(location = 0) out vec4 outColor;

void main() {
    vec2 texelSize = 1.0 / vec2(textureSize(textureToBlur, 0));

    vec3 result = vec3(0.0);

    // Kernel 3x3
    float kernel[9] = float[](
        1.0, 2.0, 1.0,
        2.0, 4.0, 2.0,
        1.0, 2.0, 1.0
    );

    float weightSum = 16.0;
    int idx = 0;

    for (int y = -1; y <= 1; ++y) {
        for (int x = -1; x <= 1; ++x) {
            vec2 offset = vec2(x, y) * texelSize;
            result += kernel[idx] * texture(textureToBlur, fragUV + offset).rgb;
            idx++;
        }
    } 

    outColor = vec4(result / weightSum, 1.0);
}
