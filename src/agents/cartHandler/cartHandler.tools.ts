import { DynamicStructuredTool, Tool, tool } from '@langchain/core/tools';
import { loadCart, newUniqueID, saveCart } from './cartHandler.utils';
import { z } from 'zod';

export type ProductT = {
  id: string;
  name: string;
  url: string;
};

const readTool: Tool = tool(
  () => {
    const cart = loadCart();
    return JSON.stringify(cart);
  },
  {
    name: 'read_tool',
    description: 'Reads the current cart.',
  },
);

const addTool: DynamicStructuredTool = tool(
  ({ product }) => {
    const cart = loadCart();
    const formattedProduct = { ...product, id: newUniqueID(cart) };
    const updatedCart = [...cart, formattedProduct];
    saveCart(updatedCart);
    return JSON.stringify({ productAdded: formattedProduct, updatedCart });
  },
  {
    name: 'add_tool',
    description: 'Adds a product to the cart.',
    schema: z.object({
      product: z.object({
        name: z.string(),
        url: z.string(),
      }),
    }),
  },
);

const removeTool: DynamicStructuredTool = tool(
  ({ product }) => {
    const cart = loadCart();
    const updatedCart = cart.filter((item: ProductT) => item.id !== product.id);
    saveCart(updatedCart);
    return JSON.stringify({ productRemoved: product, updatedCart });
  },
  {
    name: 'remove_tool',
    description: 'Removes a product from the cart.',
    schema: z.object({
      product: z.object({
        id: z.string(),
      }),
    }),
  },
);

export default [readTool, addTool, removeTool];
