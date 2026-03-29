import { CreateNoteSchema } from "./dtos/create-note.dto";
import { UpdateNoteSchema } from "./dtos/update-note.dto";
import { randomUUID } from "crypto";
import { inject, injectable } from "tsyringe";
import { ConnectionManager } from "../../database/pool";
import { noteSchema, NoteSchemaType, notesSchema } from "./dtos/note.dto";

@injectable()
export class NotesRepository {
  constructor(
    @inject("ConnectionManager") private connectionManager: ConnectionManager,
  ) {}

  async findAll(userId: string): Promise<NoteSchemaType[]> {
    const db = this.connectionManager.acquire();
    try {
      const sql = `SELECT * FROM "notes" WHERE "user_id" = ?;`;
      const stmt = db.prepare(sql);
      const notes = notesSchema.safeParse(stmt.all(userId));
      if (notes.success) {
        return notes.data;
      } else {
        return [];
      }
    } finally {
      this.connectionManager.release(db);
    }
  }

  async findById(id: string): Promise<NoteSchemaType | undefined> {
    const db = this.connectionManager.acquire();
    try {
      const sql = `SELECT * FROM "notes" WHERE "id" = ?;`;
      const stmt = db.prepare(sql);
      return stmt.get(id) as NoteSchemaType | undefined;
    } finally {
      this.connectionManager.release(db);
    }
  }

  async create(
    userId: string,
    note: CreateNoteSchema,
  ): Promise<NoteSchemaType> {
    const db = this.connectionManager.acquire();
    const noteID = randomUUID();
    const sql = `INSERT INTO "notes" ("id", "title", "description", "importance", "user_id") VALUES (?, ?, ?, ?, ?);`;

    try {
      const stmt = db.prepare(sql);
      stmt.run(noteID, note.title, note.description, note.importance, userId);
      return noteSchema.parseAsync(await this.findById(noteID));
    } catch (err) {
      if (err instanceof Error)
        console.error("SQL notes create error: ", err.message);
      throw err;
    } finally {
      this.connectionManager.release(db);
    }
  }

  async update(
    userId: string,
    noteIdToUpdate: string,
    note: UpdateNoteSchema,
  ): Promise<NoteSchemaType> {
    const db = this.connectionManager.acquire();
    const fields = [];
    const values = [];

    const fieldMap = {
      title: "title",
      description: "description",
      importance: "importance",
      completed: "completed",
    };

    for (const key in note) {
      const value = note[key as keyof UpdateNoteSchema];
      if (key === "user_id") continue;
      if (value !== undefined) {
        fields.push(`"${fieldMap[key as keyof typeof fieldMap]}" = ?`);
        values.push(value);
      }
    }

    fields.push(`"updated_at" = CURRENT_TIMESTAMP`);

    const sql = `UPDATE "notes"
    SET ${fields.join(", ")}
    WHERE "id" = ? AND user_id = ?;`;

    try {
      const stmt = db.prepare(sql);
      stmt.run(...values, noteIdToUpdate, userId);

      return noteSchema.parseAsync(await this.findById(noteIdToUpdate));
    } catch (err) {
      if (err instanceof Error)
        console.error("SQL notes update error: ", err.message);
      throw err;
    } finally {
      this.connectionManager.release(db);
    }
  }

  async delete(id: string): Promise<void> {
    const db = this.connectionManager.acquire();
    const sql = `DELETE FROM "notes" WHERE "id" = ?;`;
    const stmt = db.prepare(sql);

    try {
      stmt.run(id);
    } catch (err) {
      if (err instanceof Error)
        console.error("SQL notes delete error: ", err.message);
      throw err;
    } finally {
      this.connectionManager.release(db);
    }
  }
}
