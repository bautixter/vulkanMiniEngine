#pragma once

#include "vulkan/renderPassVK.h"

namespace MiniEngine
{
    struct Runtime;
    class MeshVK;
    typedef std::shared_ptr<MeshVK> MeshVKPtr;

    class BlurPassVK final : public RenderPassVK
    {
    public:
        BlurPassVK(
            const Runtime& i_runtime,
            const ImageBlock& i_in_texture,
            const ImageBlock& i_out_attachment
        );

        virtual ~BlurPassVK();

        bool            initialize() override;
        void            shutdown() override;
        VkCommandBuffer draw(const Frame& i_frame) override;

    private:
        BlurPassVK(const BlurPassVK&) = delete;
        BlurPassVK& operator=(const BlurPassVK&) = delete;

        void createFbo();
        void createRenderPass();
        void createPipelines();
        void createDescriptorLayout();
        void createDescriptors();
        void initAuxStructures();

        struct DescriptorsSets
        {
            VkDescriptorSet m_textures_descriptor;
        };
        
        VkRenderPass                                     m_render_pass;
        std::array<VkCommandBuffer, 3> m_command_buffer;
        std::array<VkFramebuffer, 3>   m_fbos;

        // prepare the different render supported depending on the material
        VkPipeline                                                         m_composition_pipeline;
        VkPipelineLayout                                                   m_pipeline_layouts;
        VkDescriptorSetLayout                                              m_descriptor_set_layout; //1 sets, per frame
        VkDescriptorPool                                                   m_descriptor_pool;
        std::array<DescriptorsSets, kMAX_NUMBER_OF_FRAMES> m_descriptor_sets;
        std::array<VkPipelineShaderStageCreateInfo, 2                    > m_shader_stages;

        MeshVKPtr m_plane;

        const size_t SSAO_KERNEL_SIZE = 64;

        ImageBlock m_in_texture;
        ImageBlock m_out_attachment;
    };
};