#version 460

#extension GL_ARB_shader_draw_parameters : enable
#define INV_PI 0.31830988618
#define PI   3.14159265358979323846264338327950288

layout( location = 0 ) in vec2 f_uvs;

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

layout ( set = 0, binding = 1 ) uniform sampler2D i_albedo;
layout ( set = 0, binding = 2 ) uniform sampler2D i_position_and_depth;
layout ( set = 0, binding = 3 ) uniform sampler2D i_normal;
layout ( set = 0, binding = 4 ) uniform sampler2D i_material;
layout ( set = 0, binding = 5 ) uniform sampler2D i_ssao;


layout(location = 0) out vec4 out_color;


vec3 evalDiffuse()
{
    vec4  albedo       = texture( i_albedo  , f_uvs );
    vec3  n            = normalize( texture( i_normal, f_uvs ).rgb * 2.0 - 1.0 );    
    vec3  frag_pos     = texture( i_position_and_depth, f_uvs ).xyz; // view space
    vec3  shading = vec3( 0.0 );


    for( uint id_light = 0; id_light < per_frame_data.m_number_of_lights; id_light++ )
    {
        LightData light = per_frame_data.m_lights[ id_light ];
        uint light_type = uint( floor( light.m_light_pos.a ) );

        switch( light_type )
        {
            case 0: //directional
            {
                // Transform world space direction to view space
                vec4 world_dir = vec4(light.m_light_pos.xyz, 0.0);
                vec3 view_dir = (per_frame_data.m_view * world_dir).xyz;
                vec3 l = normalize( view_dir );
                shading += max( dot( n, l ), 0.0 ) * albedo.rgb * light.m_radiance.rgb;
                break;
            }
            case 1: //point
            {
                // Transform world space position to view space
                vec4 world_pos = vec4(light.m_light_pos.xyz, 1.0);
                vec3 view_light_pos = (per_frame_data.m_view * world_pos).xyz;
                vec3 l = view_light_pos - frag_pos;
                float dist = length( l );
                l = normalize( l );
                float att = 1.0 / (light.m_attenuattion.x + light.m_attenuattion.y * dist + light.m_attenuattion.z * dist * dist );
                vec3 radiance = light.m_radiance.rgb * att;

                shading += max( dot( n, l ), 0.0 ) * albedo.rgb * radiance;
                break;
            }
            case 2: //ambient
            {
                shading += light.m_radiance.rgb * albedo.rgb;
                break;
            }
        }
    }

    return shading;
}

vec3 evalMicrofacet()
{
    // Retrieve material properties from textures
    vec4 albedo = texture(i_albedo, f_uvs);
    vec3 n = normalize(texture(i_normal, f_uvs).rgb * 2.0 - 1.0);
    vec3 frag_pos = texture(i_position_and_depth, f_uvs).xyz;
    vec4 material_params = texture(i_material, f_uvs);

    float metallic = material_params.r;
    float roughness = material_params.g;
    vec3 F0 = mix(vec3(0.04), albedo.rgb, metallic); // Interpolate between dielectric and metallic F0
    
    vec3 v = normalize(per_frame_data.m_camera_pos.xyz - frag_pos);
    vec3 shading = vec3(0.0);

    for(uint id_light = 0; id_light < per_frame_data.m_number_of_lights; id_light++)
    {
        LightData light = per_frame_data.m_lights[id_light];
        uint light_type = uint(floor(light.m_light_pos.a));
        
        vec3 l;
        vec3 radiance;
          // Calculate light direction and radiance based on light type
        switch(light_type)
        {
            case 0: // directional
                {
                    // Transform world space direction to view space
                    vec4 world_dir = vec4(light.m_light_pos.xyz, 0.0);
                    vec3 view_dir = (per_frame_data.m_view * world_dir).xyz;
                    l = normalize(view_dir);
                    radiance = light.m_radiance.rgb;
                    break;
                }
            case 1: // point
                {
                    l = light.m_light_pos.xyz - frag_pos;
                    float dist = length(l);
                    l = normalize(l);
                    float att = 1.0 / (light.m_attenuattion.x + light.m_attenuattion.y * dist + light.m_attenuattion.z * dist * dist);
                    radiance = light.m_radiance.rgb * att;
                    break;
                }
            case 2: // ambient
                shading += light.m_radiance.rgb * albedo.rgb;
                continue; // Skip BRDF calculation for ambient
        }
        
        // Calculate half vector
        vec3 h = normalize(v + l);
        
        // Calculate dot products
        float NdotV = max(dot(n, v), 0.0001);
        float NdotL = max(dot(n, l), 0.0001);
        float NdotH = max(dot(n, h), 0.0001);
        float VdotH = max(dot(v, h), 0.0001);
        
        // 1. Normal Distribution Function (GGX/Trowbridge-Reitz)
        float alpha = roughness * roughness;
        float alpha2 = alpha * alpha;
        float denom = (NdotH * NdotH) * (alpha2 - 1.0) + 1.0;
        float D = alpha2 / (PI * denom * denom);
        
        // 2. Geometric term (Schlick)
        float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
        float G1_v = NdotV / (NdotV * (1.0 - k) + k);
        float G1_l = NdotL / (NdotL * (1.0 - k) + k);
        float G = G1_v * G1_l;
        
        // 3. Fresnel term (Modified Schlick)
        float Fc = pow(1.0 - VdotH, 5.0);
        vec3 F = F0 + (1.0 - F0) * pow(2.0, (-5.55473 * VdotH - 6.98316) * VdotH);
        
        // Combine terms for specular BRDF
        vec3 specular = (D * F * G) / (4.0 * NdotV * NdotL);
        
        // Calculate diffuse (Lambert) - only for non-metals
        vec3 diffuse = (1.0 - metallic) * albedo.rgb / PI;
        
        // Combine diffuse and specular
        shading += (diffuse + specular) * radiance * NdotL;
    }

    return shading;
}

void main() 
{
    float gamma = 2.2f;
    float exposure = 1.0f;

    vec4 material_params = texture(i_material, f_uvs);
    float material_type = material_params.g;

    vec3 out_eval = vec3(0.0);
    if (material_type == 0.5f) // Diffuse
    {
        out_eval = evalDiffuse();
    } else {
        out_eval = evalMicrofacet();
    }

    float occlusion = texture(i_ssao, f_uvs).r;
    vec3 mapped = vec3( 1.0f ) - exp(-out_eval * exposure);

    out_color = vec4( pow( mapped, vec3( 1.0f / gamma ) ), 1.0 ) * occlusion;
}