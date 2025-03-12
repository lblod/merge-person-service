export class CustomError extends Error {
  constructor(message: string) {
    super(message);

    console.log('\n Custom error: ', this.message);
  }
}
