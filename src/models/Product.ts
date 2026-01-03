import mongoose, { Schema, Document } from "mongoose";

export enum Category {
    JAR = "JAR",
    NORMAL = "NORMAL",
    LUXURY = "LUXURY"
}

export interface IProduct extends Document {
    _id: mongoose.Types.ObjectId,
    title: string,
    description?: string,
    category: Category,
    fragrance?: string
    size: string,
    price: number,
    stock: number,
    imageUrls: string[],
    createdAt: Date
}

const productSchema: Schema = new Schema<IProduct>({
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, enum: Object.values(Category), required: true },
    fragrance: { type: String },
    size: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, min: 0 },
    imageUrls: { type: [String], required: true },
    createdAt: { type: Date, default: Date.now }
});

export const Product = mongoose.model<IProduct>("Product", productSchema);