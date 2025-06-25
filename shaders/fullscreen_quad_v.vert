#version 460

layout(location = 0) out vec2 f_uvs;

void main() {
    vec2 positions[3] = vec2[](
        vec2(-1.0, -1.0),
        vec2( 3.0, -1.0),
        vec2(-1.0,  3.0)
    );

    gl_Position = vec4(positions[gl_VertexIndex], 0.0, 1.0);
    f_uvs = gl_Position.xy * 0.5 + 0.5;  // map from [-1,1] to [0,1]
}
