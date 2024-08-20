
module.exports = {
  async getNodes(ctx, next) {
    try {
      const data = await strapi
        .service("api::company.company")
        .getNodes();
      console.log(data, "data");

      ctx.body = data;
    } catch (err) {
      ctx.badRequest("Post report controller error", { moreDetails: err });
    }
  },



  async createNode(ctx) {
    const { name, parentId } = ctx.request.body.data;
    try {
      if (!name || typeof name !== 'string') {
        ctx.throw(400, 'Name is required and must be a string');
      }

      const node = await strapi.service('api::company.company').createNode(name, parentId);
      ctx.send({ data: node }); // Ensure response is correctly formatted
    } catch (error) {
      console.error('Error creating node:', error);
      ctx.throw(500, `Error creating node: ${error.message}`);
    }
  },



  async deleteNode(ctx) {
    const { id } = ctx.params; // Extract ID from the request parameters

    try {
      // Check if the node exists
      const node = await strapi.query('api::node.node').findOne({ where: { id } });

      if (!node) {
        // If the node does not exist, return a 200 response with a message
        return ctx.send({ message: 'Node not found' }, 200);
      }

      // Check if the node has children
      const hasChildren = await strapi.query('api::node.node').count({ where: { parent: id } });

      if (hasChildren > 0) {
        // If the node has children, return a 200 response with a message
        return ctx.send({ message: 'Node has children and cannot be deleted' }, 200);
      }

      // Delete the node
      await strapi.query('api::node.node').delete({ where: { id } });

      // Return a success response
      ctx.send({ message: 'Node successfully deleted' }, 200);
    } catch (error) {
      // Log the error and return a 200 response with an error message
      strapi.log.error(`Error deleting node with ID ${id}:`, error);
      ctx.send({ message: 'An error occurred while deleting the node' }, 200);
    }
  },


  async editName(ctx) {
    const { id } = ctx.params;
    const { name } = ctx.request.body.data;

    try {
      if (!name || typeof name !== 'string') {
        ctx.throw(400, 'Name is required and must be a string');
      }

      const updatedNode = await strapi.service('api::company.company').updateName(id, name);
      ctx.send({ data: updatedNode });
    } catch (error) {
      console.error('Error updating node name:', error);
      ctx.throw(500, `Error updating node name: ${error.message}`);
    }
  },


  async editPosition(ctx) {
    const { id } = ctx.params; // Get the node ID from the URL parameters
    const { newParentId } = ctx.request.body.data; // Get the new parent ID from the request body

    // Validate input
    if (!id || !newParentId) {
      return ctx.badRequest('ID and new parent ID are required');
    }

    try {
      // Call the service to update the node's parent
      const updatedNode = await strapi.service('api::company.company').updateNodePosition(id, newParentId);

      if (!updatedNode) {
        return ctx.notFound('Node not found');
      }

      return ctx.send(updatedNode);
    } catch (err) {
      return ctx.internalServerError('An error occurred while updating the node position');
    }
  },


  async filter(ctx) {
    try {
      // Extract query parameters from the request
      const { name } = ctx.request.query;

      // Check if the query parameter 'name' is missing
      if (!name) {
        ctx.throw(400, 'Node name is required.');
      }

      // Call the service method to get ancestor data
      const result = await strapi.service('api::company.company').filter({ query: { name } });

      // Send response with the ancestor data
      ctx.send(result);
    } catch (err) {
      // Handle any errors that occur
      ctx.throw(500, err.message);
    }
  },

  async getRootNode(ctx) {
    try {
      // Call the service method to get nodes with null parent
      const data = await strapi.service('api::company.company').nullParent();
      // Send the response
      ctx.send(data);
    } catch (error) {
      // Send an error response
      ctx.send({ message: `We encountered an error: ${error.message}` });
    }
  },

  async childrens(ctx) {
    try {
      const { name } = ctx.params;
      console.log("name", name);

      if (!name) {
        return ctx.send({ message: 'Name parameter is required' }, 400);
      }

      const node = await strapi.service('api::company.company').getChildren(name);
      ctx.send(node);
    } catch (error) {
      ctx.send({ message: `We encountered an error: ${error.message}` }, 500);
    }
  },



    async dropdown(ctx) {
      try {
        const { id } = ctx.params;
        console.log('ID Received:', id); // Log the ID received
        const nodes = await strapi.service('api::company.company').dropdown(id);
        console.log('Nodes Retrieved:', nodes); // Log the nodes fetched
        ctx.send(nodes);
      } catch (err) {
        console.error('Error:', err); // Log the error for debugging
        ctx.throw(500, 'Error fetching dropdown nodes');
      }
    },



};

