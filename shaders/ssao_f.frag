#version 460

#define SSAO_KERNEL_SIZE 64
#define SSAO_RADIUS 1.5      // Increased from 1.5 - larger sampling radius
#define SSAO_BIAS 0.02       // Decreased from 0.05 - less bias means stronger occlusion
#define SSAO_SHARPNESS 3.0   // Increased from 2.0 - sharper contrast

layout(location = 0) in vec2 f_uvs;
layout(location = 0) out float out_occlusion;

// Descriptors
layout(set = 0, binding = 1) uniform sampler2D position_texture;    // View-space positions (xyz)
layout(set = 0, binding = 2) uniform sampler2D normal_texture;      // View-space normals (xyz, packed [0,1] -> unpack to [-1,1])
layout(set = 0, binding = 3) uniform sampler2D noise_texture;       // 4x4 random rotation texture
layout(set = 0, binding = 4) uniform SSAOKernel {                   // Hemispheric kernel samples
    vec4 samples[SSAO_KERNEL_SIZE];
} ssao_kernel;

layout(set = 0, binding = 0) uniform PerFrameData {
    mat4 projection;
    mat4 view;
    mat4 inv_projection;
    mat4 inv_view;
} per_frame_data;

void main() {    // Get view-space position and normal
    vec3 fragPosVS = texture(position_texture, f_uvs).xyz;
    vec3 normalVS = normalize(texture(normal_texture, f_uvs).xyz * 2.0 - 1.0); // Unpack from [0,1] to [-1,1]
    
    // Early out for background pixels - check if we have valid geometry data
    // Background pixels typically have zero or very small position values
    if (length(fragPosVS) < 0.01) {
        out_occlusion = 1.0;
        return;
    }
    
    // Get random rotation vector and create TBN matrix
    ivec2 texSize = textureSize(position_texture, 0);
    ivec2 noiseSize = textureSize(noise_texture, 0);
    vec2 noiseScale = vec2(texSize) / vec2(noiseSize);
    
    vec3 randomVec = normalize(texture(noise_texture, f_uvs * noiseScale).xyz * 2.0 - 1.0);
    
    // Create orthogonal basis
    vec3 tangent = normalize(randomVec - normalVS * dot(randomVec, normalVS));
    vec3 bitangent = cross(normalVS, tangent);
    mat3 TBN = mat3(tangent, bitangent, normalVS);

    // Calculate occlusion
    float occlusion = 0.0;
    for (int i = 0; i < SSAO_KERNEL_SIZE; ++i) {
        // Get sample position in view space
        vec3 samplePosVS = fragPosVS + (TBN * ssao_kernel.samples[i].xyz) * SSAO_RADIUS;
        
        // Project sample position
        vec4 offset = per_frame_data.projection * vec4(samplePosVS, 1.0);
        offset.xyz /= offset.w;               // Perspective divide
        offset.xy = offset.xy * 0.5 + 0.5;    // Transform to [0,1] range
        
        // Get depth of nearest geometry at sample position
        float sampleDepth = texture(position_texture, offset.xy).z;
        
        // Range check and occlusion calculation
        float rangeCheck = smoothstep(0.0, 1.0, SSAO_RADIUS / abs(fragPosVS.z - sampleDepth));
        float depthDifference = sampleDepth - samplePosVS.z;
        
        // Smoother occlusion contribution with sharpness control
        float occlusionContrib = rangeCheck * smoothstep(SSAO_BIAS, SSAO_BIAS + 0.05, depthDifference);
        
        // Apply additional power curve to strengthen occlusion
        occlusionContrib = pow(occlusionContrib, 1.5);
        
        occlusion += occlusionContrib;
    }

    // Normalize and invert result
    occlusion = 1.0 - (occlusion / float(SSAO_KERNEL_SIZE));
    
    // Apply power curve for contrast and additional strength multiplier
    occlusion = pow(occlusion, SSAO_SHARPNESS);
        
    out_occlusion = occlusion;
}