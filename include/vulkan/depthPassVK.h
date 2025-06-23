#pragma once

#include "vulkan/renderPassVK.h"

namespace MiniEngine
{
    struct Runtime;
    class Entity;
    typedef std::shared_ptr<Entity> EntityPtr;

    class DepthPassVK final : public RenderPassVK
    {
    public:

        // Constructor
        // ---------------------------------------------------
        // Initializes the depth pass with runtime context and the target depth image.
        DepthPassVK(
            const Runtime& i_runtime,
            const ImageBlock& i_depth_attachment
        );

        // Destructor
        // ---------------------------------------------------
        // Cleans up Vulkan resources used by the depth pass.
        virtual ~DepthPassVK();

        // Inherited Methods
        // ---------------------------------------------------

        // Initializes Vulkan-specific resources required for the depth pass.
        bool initialize() override;

        // Releases Vulkan resources.
        void shutdown() override;

        // Records and returns the Vulkan command buffer for the depth pass rendering.
        VkCommandBuffer draw(const Frame& i_frame) override;

        // Adds an entity to the draw list for the current frame.
        void addEntityToDraw(const EntityPtr i_entity) override;

    private:

        // Deleted copy constructor and assignment operator to prevent copying.
        DepthPassVK(const DepthPassVK&) = delete;
        DepthPassVK& operator=(const DepthPassVK&) = delete;

        // Auxiliary functions
        // ---------------------------------------------------

        // Creates framebuffers for the depth rendering pass.
        void createFbo();

        // Sets up the Vulkan render pass used to write depth information.
        void createRenderPass();

        // Creates the graphics pipelines for materials that support depth rendering.
        void createPipelines();

        // Defines the layout of descriptor sets used in the depth pass.
        void createDescriptorLayout();

        // Allocates and initializes descriptor sets used for per-frame and per-object data.
        void createDescriptors();

        // Descriptor Sets
        // ---------------------------------------------------

        struct DescriptorsSets
        {
            VkDescriptorSet m_per_frame_descriptor;   // Descriptor for per-frame uniform buffer.
            VkDescriptorSet m_per_object_descriptor;  // Descriptor for per-object data (e.g., transform).
        };

        struct MaterialPipeline
        {
            // Stores the pipeline configuration for a material that supports depth rendering.
            VkPipeline                                       m_pipeline;                // Graphics pipeline handle.
            VkPipelineLayout                                 m_pipeline_layouts;        // Layout for pipeline descriptors.
            std::array<VkDescriptorSetLayout, 2>             m_descriptor_set_layout;   // Descriptor set layouts (frame + object).
            std::array<DescriptorsSets, 3>                   m_descriptor_sets;         // Descriptor sets for triple buffering.
            std::array<VkPipelineShaderStageCreateInfo, 1>   m_shader_stages;           // Shader stages (likely just vertex shader).
        };

        // Private Members
        // ---------------------------------------------------

        std::array<MaterialPipeline, 2>  m_pipelines;        // Pipelines for different material configurations (e.g., skinned/static).
        VkRenderPass                     m_render_pass;      // Vulkan render pass object for depth writing.
        VkDescriptorPool                 m_descriptor_pool;  // Pool used to allocate descriptor sets.
        std::array<VkCommandBuffer, 3>   m_command_buffer;   // Pre-recorded command buffers (triple buffering).
        std::array<VkFramebuffer, 3>     m_fbos;             // Framebuffers used in the depth pass (triple buffered).

        // Map of entities to draw, grouped by a key (e.g., material or layer).
        std::unordered_map<uint32_t, std::vector<EntityPtr>> m_entities_to_draw;

        const ImageBlock m_depth_attachment; // Output depth image to write results into.
    };
};
