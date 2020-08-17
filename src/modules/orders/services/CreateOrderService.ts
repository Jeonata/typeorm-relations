import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('This customer does not exist.');
    }

    const newProducts = await this.productsRepository.findAllById(products);

    if (newProducts.length !== products.length) {
      throw new AppError('One or more products do not exist.');
    }

    await this.productsRepository.updateQuantity(products);

    const ordersProducts = newProducts.map(product => {
      const quantity: number =
        products.find(item => product.id === item.id)?.quantity || 0;

      if (product.quantity < quantity) {
        throw new AppError(
          `The product ${product.name} does not have enough quanity avaliable in stock`,
        );
      }
      return {
        product_id: product.id,
        price: product.price,
        quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: ordersProducts,
    });

    return order;
  }
}

export default CreateOrderService;
