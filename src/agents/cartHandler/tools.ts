import { DynamicStructuredTool } from '@langchain/core/tools';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import * as path from 'path';
import { z } from 'zod';

const loadCart = async () => {
  const filePath = path.resolve(__dirname, 'cart.json');
  if (!existsSync(filePath)) {
    return [];
  }
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

const saveCart = async (cart) => {
  const filePath = path.resolve(__dirname, 'cart.json');
  writeFileSync(filePath, JSON.stringify(cart, null, 2));
};

const readTool = new DynamicStructuredTool({
  name: 'read_tool',
  description: 'Displays the current cart.',
  schema: z.object({
    product: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        url: z.string().optional(),
      })
      .optional(),
  }),
  func: async () => {
    const cart = await loadCart();
    return JSON.stringify(cart);
  },
});

const addTool = new DynamicStructuredTool({
  name: 'add_tool',
  description: 'Adds a product to the cart.',
  schema: z.object({
    product: z.object({
      id: z.string(),
      name: z.string(),
      url: z.string().optional(),
    }),
  }),
  func: async ({ product }) => {
    const cart = await loadCart();
    cart.push(product);
    await saveCart(cart);
    return `Product added: ${product.name}`;
  },
});

const removeTool = new DynamicStructuredTool({
  name: 'remove_tool',
  description: 'Removes a product from the cart.',
  schema: z.object({
    product: z.object({
      id: z.string(),
    }),
  }),
  func: async ({ product }) => {
    const cart = await loadCart();
    const updatedCart = cart.filter((item) => item.id !== product.id);
    await saveCart(updatedCart);
    return `Product removed: ${product.id}`;
  },
});

export default [readTool, addTool, removeTool];