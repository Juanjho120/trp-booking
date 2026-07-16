export type AdminActor = Readonly<{
  email: string;
  name?: string | null;
}>;

export type AdminPropertyOption = Readonly<{
  id: string;
  nameEs: string;
  nameEn: string;
}>;

export type AdminPagination = Readonly<{
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}>;
