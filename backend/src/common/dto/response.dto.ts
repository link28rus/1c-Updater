export class ResponseDto<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;

  constructor(data?: T, message?: string) {
    this.success = true;
    this.data = data;
    this.message = message;
  }

  static success<T>(data?: T, message?: string): ResponseDto<T> {
    return new ResponseDto(data, message);
  }

  static error(message: string, error?: string): ResponseDto<null> {
    const response = new ResponseDto<null>();
    response.success = false;
    response.message = message;
    response.error = error;
    return response;
  }
}




