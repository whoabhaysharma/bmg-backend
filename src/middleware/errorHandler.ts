import { Request, Response, NextFunction } from 'express';

export class HttpException extends Error {
  constructor(public status: number, public message: string) {
    super(message);
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof HttpException) {
    return res.status(error.status).json({
      status: error.status,
      message: error.message,
    });
  }

  return res.status(500).json({
    status: 500,
    message: 'Internal Server Error',
  });
};