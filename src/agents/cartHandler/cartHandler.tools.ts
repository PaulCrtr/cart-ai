import { tool } from '@langchain/core/tools';
import { loadCart, saveCart } from './cartHandler.utils';
import { z } from 'zod';

export type ProductT = {
  id: string;
  name: string;
  url: string;
};

const readTool = tool(
  async () => {
    const cart = await loadCart();
    return JSON.stringify(cart);
  },
  {
    name: 'read_tool',
    description: 'Displays the current cart.',
  },
);

const addTool = tool(
  async ({ product }) => {
    const cart = await loadCart();
    cart.push(product);
    await saveCart(cart);
    return `Product added: ${product.name}.`;
  },
  {
    name: 'add_tool',
    description: 'Adds a product to the cart.',
    schema: z.object({
      product: z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
      }),
    }),
  },
);

const removeTool = tool(
  async ({ product }) => {
    const cart = await loadCart();
    const updatedCart = cart.filter((item: ProductT) => item.id !== product.id);
    await saveCart(updatedCart);
    return `Product removed: ${product.id}`;
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
