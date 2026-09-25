import { RouterModule, Routes } from "@nestjs/core";
import { BooksModule } from "./books/books.module";
import { booksRoutes } from "./books/books.routes";
export const routes: Routes = [{ path: booksRoutes.root, module: BooksModule }];
export const router = RouterModule.register(routes);
