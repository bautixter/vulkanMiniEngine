#pragma once

#include "vulkan/renderPassVK.h"

namespace MiniEngine
{
    struct Runtime;
    class MeshVK;
    typedef std::shared_ptr<MeshVK> MeshVKPtr;

    class SsaoPassVK final : public RenderPassVK
    {
    public:
        SsaoPassVK(
            const Runtime& i_runtime,
            const ImageBlock& i_in_position_depth_attachment,
            const ImageBlock& i_in_normal_attachment,
            const ImageBlock& i_out_ssao_attachment
        );

        virtual ~SsaoPassVK();

        bool            initialize() override;
        void            shutdown() override;
        VkCommandBuffer draw(const Frame& i_frame) override;

    private:
        SsaoPassVK(const SsaoPassVK&) = delete;
        SsaoPassVK& operator=(const SsaoPassVK&) = delete;

        void createFbo();
        void createRenderPass();
        void createPipelines();
        void createDescriptorLayout();
        void createDescriptors();
        void initAuxStructures();

        struct DescriptorsSets
        {
            VkDescriptorSet m_textures_descriptor;
        };        VkRenderPass                                     m_render_pass;
        std::array<VkCommandBuffer, kMAX_NUMBER_OF_FRAMES> m_command_buffer;
        std::array<VkFramebuffer, kMAX_NUMBER_OF_FRAMES>   m_fbos;

        // prepare the different render supported depending on the material
        VkPipeline                                                         m_composition_pipeline;
        VkPipelineLayout                                                   m_pipeline_layouts;
        VkDescriptorSetLayout                                              m_descriptor_set_layout; //1 sets, per frame
        VkDescriptorPool                                                   m_descriptor_pool;
        std::array<DescriptorsSets, kMAX_NUMBER_OF_FRAMES> m_descriptor_sets;
        std::array<VkPipelineShaderStageCreateInfo, 2                    > m_shader_stages;

        MeshVKPtr m_plane;

        // 
        struct Buffer {
            VkBuffer buffer;
            VkDeviceMemory memory;
        };

        std::vector<Vector4f> m_ssao_kernel;    // Muestras del kernel en CPU
        Buffer m_kernel_buffer;                 // Buffer para almacenar las muestras del kernel en GPU
        const size_t SSAO_KERNEL_SIZE = 64;

        ImageBlock m_in_position_depth_attachment;
        ImageBlock m_in_normal_attachment;
        ImageBlock m_out_ssao_attachment;
        ImageBlock m_noise_texture;

    };
};
