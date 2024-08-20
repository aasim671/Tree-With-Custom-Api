module.exports = {
  async getNodes() {
    try {
      // Fetch all nodes and populate their parent information
      const nodes = await strapi.entityService.findMany('api::node.node', {
        populate: { parent: true }, // Ensure parent relationship is populated
      });

      // Create a map to hold nodes by their ID
      const map = new Map();
      nodes.forEach(node => {
        // Ensure each node has a 'children' property
        map.set(node.id, { ...node, children: [] });
      });

      // Build the tree structure
      const tree = [];
      map.forEach(node => {
        if (node.parent) {
          const parent = map.get(node.parent.id); // Get parent from the map using parent ID
          if (parent) {
            parent.children.push(node); // Add current node as a child of the parent
          }
        } else {
          tree.push(node); // This node is a root node
        }
      });

      return tree;
    } catch (err) {
      console.error('Error fetching nodes:', err);
      throw new Error('Error fetching nodes');
    }
  },



  async createNode(name, parentId) {
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid or missing node name');
    }

    try {
      const node = await strapi.entityService.create('api::node.node', {
        data: {
          name,
          parent: parentId || null,
        },
      });

      return node;
    } catch (error) {
      console.error('Error creating node:', {
        message: error.message,
        stack: error.stack,
        status: error.status,
        details: error.details,
      });

      throw new Error('An error occurred while creating the node. Please check the server logs for more details.');
    }
  },


  async deleteNode(id) {
    return strapi.query('api::node.node').delete({
      where: { id },
    });
  },




  async updateName(id, name) {
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid or missing name');
    }

    try {
      const node = await strapi.entityService.findOne('api::node.node', id);

      if (!node) {
        throw new Error('Node not found');
      }

      const updatedNode = await strapi.entityService.update('api::node.node', id, {
        data: { name },
      });

      return updatedNode;
    } catch (error) {
      console.error('Error updating node:', {
        message: error.message,
        stack: error.stack,
        status: error.status,
        details: error.details,
      });

      throw new Error('An error occurred while updating the node. Please check the server logs for more details.');
    }
  },



  async updateNodePosition(id, newParentId) {
    try {
      // Find the node by ID
      const node = await strapi.entityService.findOne('api::node.node', id);

      if (!node) {
        return null; // Node not found
      }

      // Find the new parent node by ID
      const newParent = await strapi.entityService.findOne('api::node.node', newParentId);

      if (!newParent) {
        throw new Error('New parent node not found');
      }

      // Update the node's parent
      const updatedNode = await strapi.entityService.update('api::node.node', id, {
        data: { parent: newParentId }, // Set the new parent ID
      });

      return updatedNode; // Return the updated node
    } catch (err) {
      strapi.log.error('Error updating node position:', err);
      throw new Error('Error updating node position');
    }
  },


  async filter(params) {
    const { name } = params.query;

    // Validate input
    if (!name) {
        throw new Error('Node name is required.');
    }

    // Find the nodes by name (partial match)
    const nodes = await strapi.query('api::node.node').findMany({
        where: {
            name: {
                $containsi: name // Perform a case-insensitive search containing the provided name
            }
        },
        populate: { parent: true } // Make sure to populate parent relation
    });

    if (nodes.length === 0) {
        // Return an empty array instead of throwing an error
        return [];
    }

    const nodeMap = new Map();

    // Initialize map with nodes
    nodes.forEach(node => nodeMap.set(node.id, { ...node, children: [] }));

    // Create a function to recursively find and set ancestors
    const buildHierarchy = async (node) => {
        let currentNode = node;

        while (currentNode.parent) {
            const parentNode = await strapi.query('api::node.node').findOne({
                where: { id: currentNode.parent.id },
                populate: { parent: true }
            });

            if (parentNode) {
                if (!nodeMap.has(parentNode.id)) {
                    nodeMap.set(parentNode.id, { ...parentNode, children: [] });
                }
                // Avoid adding the same node multiple times
                const parent = nodeMap.get(parentNode.id);
                if (!parent.children.some(child => child.id === currentNode.id)) {
                    parent.children.push(nodeMap.get(currentNode.id));
                }
                currentNode = parentNode;
            } else {
                break;
            }
        }
    };

    // Build hierarchy for all nodes
    for (const node of nodes) {
        await buildHierarchy(node);
    }

    // Function to check if a node has children and add the hasChildren status
    const checkAndAddHasChildrenStatus = async (node) => {
        const childrenCount = await strapi.query('api::node.node').count({
            where: { parent: node.id }
        });
        node.status = childrenCount > 0;
        for (const child of node.children) {
            await checkAndAddHasChildrenStatus(child);
        }
    };

    // Build the result tree by finding the root nodes
    const roots = Array.from(nodeMap.values()).filter(node => {
        return !node.parent || !nodeMap.has(node.parent.id);
    });

    // Ensure all nodes in the hierarchy have the hasChildren status
    for (const root of roots) {
        await checkAndAddHasChildrenStatus(root);
    }

    return roots;
},



//past
  // async filter(params) {
  //   const { name } = params.query;

  //   // Validate input
  //   if (!name) {
  //     throw new Error('Node name is required.');
  //   }

  //   // Find the nodes by name (partial match)
  //   const nodes = await strapi.query('api::node.node').findMany({
  //     where: {
  //       name: {
  //         $containsi: name // Perform a case-insensitive search containing the provided name
  //       }
  //     },
  //     populate: { parent: true } // Make sure to populate parent relation
  //   });

  //   if (nodes.length === 0) {
  //     throw new Error('Node not found.');
  //   }

  //   const nodeMap = new Map();

  //   // Initialize map with nodes
  //   nodes.forEach(node => nodeMap.set(node.id, { ...node, children: [] }));

  //   // Create a function to recursively find and set ancestors
  //   const buildHierarchy = async (node) => {
  //     let currentNode = node;

  //     while (currentNode.parent) {
  //       const parentNode = await strapi.query('api::node.node').findOne({
  //         where: { id: currentNode.parent.id },
  //         populate: { parent: true }
  //       });

  //       if (parentNode) {
  //         if (!nodeMap.has(parentNode.id)) {
  //           nodeMap.set(parentNode.id, { ...parentNode, children: [] });
  //         }
  //         // Avoid adding the same node multiple times
  //         const parent = nodeMap.get(parentNode.id);
  //         if (!parent.children.some(child => child.id === currentNode.id)) {
  //           parent.children.push(nodeMap.get(currentNode.id));
  //         }
  //         currentNode = parentNode;
  //       } else {
  //         break;
  //       }
  //     }
  //   };

  //   // Build hierarchy for all nodes
  //   for (const node of nodes) {
  //     await buildHierarchy(node);
  //   }

  //   // Build the result tree by finding the root nodes
  //   const roots = Array.from(nodeMap.values()).filter(node => {
  //     return !node.parent || !nodeMap.has(node.parent.id);
  //   });

  //   // Ensure we include all nodes in the hierarchy
  //   const ensureInHierarchy = (node) => {
  //     if (node.children.length === 0 && nodeMap.has(node.id)) {
  //       const originalNode = nodeMap.get(node.id);
  //       node.children = originalNode.children;
  //     }
  //     node.children.forEach(ensureInHierarchy);
  //   };

  //   roots.forEach(ensureInHierarchy);

  //   return roots;
  // },


  async nullParent() {
    try {

      const nodesWithNullParent = await strapi.entityService.findMany('api::node.node', {
        filters: {
          parent: {

            // @ts-ignore
            $null: true,
          },
        },
      });

     //check if they are parent of other nodes
      const updatedNodes = await Promise.all(
        nodesWithNullParent.map(async (node) => {
          const children = await strapi.entityService.findMany('api::node.node', {
            filters: {
              parent: {
                name: node.name,
              },
            },
          });

          // Return the node with updated status and empty children array
          return {
            ...node,
          status: children.length > 0, // true if the node has children, false otherwise
            children: [], // Keeping children array empty as per your requirement
          };
        })
      );

      // Return the updated nodes
      return updatedNodes;
    } catch (error) {
      // Log and throw an error if something goes wrong
      strapi.log.error('Error fetching nodes with null parent:', error);
      throw new Error('Error fetching nodes with null parent');
    }
  },


  // async getChildren(parentName) {
  //   try {
  //     const children = await strapi.entityService.findMany('api::node.node', {
  //       filters: {
  //         parent: {
  //           name: parentName,
  //         },
  //       },
  //     });

  //     const result = await Promise.all(
  //       children.map(async (child) => {
  //         const grandChildren = await strapi.entityService.findMany('api::node.node', {
  //           filters: {
  //             parent: {
  //               name: child.name,
  //             },
  //           },
  //         });

  //         return {
  //           id: child.id,
  //           name: child.name,
  //           status: grandChildren.length > 0,
  //         };
  //       })
  //     );

  //     return result;
  //   } catch (error) {
  //     strapi.log.error('Error fetching children nodes:', error);
  //     throw new Error('Error fetching children nodes');
  //   }
  // }


  async getChildren(parentId) {
    try {
      // Fetch children based on the parent ID
      const children = await strapi.entityService.findMany('api::node.node', {
        filters: {
          parent: {
            id: parentId,
          },
        },
      });

      // Fetch grandchildren for each child node
      const result = await Promise.all(
        children.map(async (child) => {
          const grandChildren = await strapi.entityService.findMany('api::node.node', {
            filters: {
              parent: {
                id: child.id,
              },
            },
          });

          return {
            id: child.id,
            name: child.name,
            status: grandChildren.length > 0,
          };
        })
      );

      return result;
    } catch (error) {
      strapi.log.error('Error fetching children nodes:', error);
      throw new Error('Error fetching children nodes');
    }
  }



};
