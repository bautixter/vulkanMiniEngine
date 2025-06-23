#version 460

#extension GL_ARB_shader_draw_parameters : enable

//inputs
layout( location = 0 ) in vec3 v_positions;

//globals
struct LightData
{
    vec4 m_light_pos;
    vec4 m_radiance;
    vec4 m_attenuattion;
};

layout( std140, set = 0, binding = 0 ) uniform PerFrameData
{
    vec4      m_camera_pos;
    mat4      m_view;
    mat4      m_projection;
    mat4      m_view_projection;
    mat4      m_inv_view;
    mat4      m_inv_projection;
    mat4      m_inv_view_projection;
    vec4      m_clipping_planes;
    LightData m_lights[ 10 ];
    uint      m_number_of_lights;
} per_frame_data;


struct ObjectData
{
    mat4 m_model;
    vec4 m_albedo; 
    vec4 m_metallic_roughness;
};

//all object matrices
layout(std140,set = 1, binding = 0) readonly buffer ObjectBufferData
{
    ObjectData objects[];
} per_object_data;

void main() {
    //pos in view space
    vec4 pos = per_object_data.objects[ gl_BaseInstance ].m_model * vec4(v_positions, 1.0);

    gl_Position = per_frame_data.m_projection * per_frame_data.m_view * pos;
}