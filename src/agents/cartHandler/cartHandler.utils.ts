import { writeFileSync, readFileSync, existsSync } from 'fs';
import * as path from 'path';
import { ProductT } from './cartHandler.tools';

export const loadCart = (): ProductT[] => {
  const filePath = path.resolve(__dirname, 'cart.json');
  if (!existsSync(filePath)) {
    return [];
  }
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

export const saveCart = (cart: ProductT[]): void => {
  const filePath = path.resolve(__dirname, 'cart.json');
  writeFileSync(filePath, JSON.stringify(cart, null, 2));
};

// Generates a new unique ID for a product based on the current cart items
export const newUniqueID = (cart: ProductT[]): string => {
  let newID = 1;
  const currentIDs = cart.map(({ id }) => Number(id));
  while (currentIDs.includes(newID)) {
    newID++;
  }
  return newID.toString();
};
