export type Prize = {
  id: string;
  name: string;
  data: {
    data: Record<string, number[]>;
    columns: string[];
  };
};
