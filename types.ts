export type PersonCreate = {
  identifier: string;
  firstName: string;
  lastName: string;
  alternativeName: string | undefined;
  birthdate: Date;
};

export type Person = PersonCreate & {
  uri: string | undefined;
  graph: string | undefined;
};
