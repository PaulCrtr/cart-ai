import { writeFileSync, readFileSync, existsSync } from 'fs';
import * as path from 'path';
import { ProductT } from './cartHandler.tools';

export const loadCart = async () => {
  const filePath = path.resolve(__dirname, 'cart.json');
  if (!existsSync(filePath)) {
    return [];
  }
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

export const saveCart = async (cart: ProductT[]) => {
  const filePath = path.resolve(__dirname, 'cart.json');
  writeFileSync(filePath, JSON.stringify(cart, null, 2));
};
