import { inject, injectable } from "tsyringe";
import { NotFoundError } from "../../shared/errors/not-found.error";
import { CreateNoteSchema } from "./dtos/create-note.dto";
import { UpdateNoteSchema } from "./dtos/update-note.dto";
import { NotesRepository } from "./notes.repository";
import { NoteSchemaType } from "./dtos/note.dto";
import { JWTPayloadDTO } from "../auth/dtos/jwt-payload.dto";
import { UsersRepository } from "../users/users.repository";
import { UnauthorizedError } from "../../shared/errors/unauthorized.error";
import { ForbiddenError } from "../../shared/errors/forbidden.error";

@injectable()
export class NotesService {
  constructor(
    @inject("NotesRepository") private notesRepository: NotesRepository,
    @inject("UsersRepository") private userRepository: UsersRepository,
  ) {}

  async getAll(
    autheticatedUser: JWTPayloadDTO | undefined,
  ): Promise<NoteSchemaType[]> {
    if (!autheticatedUser) throw new UnauthorizedError();
    const notes = await this.notesRepository.findAll(autheticatedUser.id);
    return notes;
  }

  async getById(id: string) {
    const note = await this.notesRepository.findById(id);
    if (!note) {
      throw new NotFoundError("Nota");
    }
    return note;
  }

  async create(
    autheticatedUser: JWTPayloadDTO | undefined,
    note: CreateNoteSchema,
  ) {
    if (!autheticatedUser) throw new UnauthorizedError();

    return await this.notesRepository.create(autheticatedUser.id, note);
  }

  async update(
    autheticatedUser: JWTPayloadDTO | undefined,
    noteIdToUpdate: string,
    note: UpdateNoteSchema,
  ): Promise<NoteSchemaType> {
    if (!autheticatedUser) throw new UnauthorizedError();

    const noteExists = await this.notesRepository.findById(noteIdToUpdate);
    if (!noteExists) throw new NotFoundError("Nota");

    if (
      autheticatedUser.role !== "admin" &&
      autheticatedUser.id !== noteExists.user_id
    )
      throw new ForbiddenError();

    return await this.notesRepository.update(
      autheticatedUser.id,
      noteIdToUpdate,
      note,
    );
  }

  async delete(
    autheticatedUser: JWTPayloadDTO | undefined,
    noteIdToDelete: string,
  ): Promise<void> {
    if (!autheticatedUser) throw new UnauthorizedError();

    const noteExists = await this.notesRepository.findById(noteIdToDelete);
    if (!noteExists) throw new NotFoundError("Nota");

    if (
      autheticatedUser.role !== "admin" &&
      autheticatedUser.id !== noteExists.user_id
    )
      throw new ForbiddenError();
    this.notesRepository.delete(noteIdToDelete);
  }
}
