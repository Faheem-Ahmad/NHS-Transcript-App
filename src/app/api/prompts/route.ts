import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    // Extract search parameters from the URL
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");
    const type = searchParams.get("type");

    // Validate required parameters
    if (!keyword || !type) {
      return NextResponse.json(
        { error: "Both 'keyword' and 'type' parameters are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("BookStoreMD");
    const collection = db.collection("Prompts");

    // Find single document matching criteria
    const prompt = await collection.findOne({
      keyword: keyword,
      type: type,
      active: true,
    });

    // Handle case where no prompt is found
    if (!prompt) {
      return NextResponse.json(
        { error: "No active prompt found for the given keyword and type" },
        { status: 404 }
      );
    }

    // Format response for frontend
    const result = {
      id: prompt._id.toString(),
      type: prompt.type,
      keyword: prompt.keyword,
      content: prompt.content,
      isActive: prompt.active,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching prompt:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompt" },
      { status: 500 }
    );
  }
}
/* export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("BookStoreMD");
    const collection = db.collection("Prompts");

    const prompts = await collection.find().toArray();

    const result = prompts.map((prompt) => ({
      id: prompt._id.toString(),
      type: prompt.type,
      keyword: prompt.keyword,
      content: prompt.content,
      isActive: prompt.active,
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body.type || !body.keyword || !body.content) {
      return NextResponse.json(
        { error: "Type, Keyword, and Content are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("BookStoreMD");
    const collection = db.collection("Prompts");

    const result = await collection.insertOne({
      type: body.type,
      keyword: body.keyword,
      content: body.content,
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { message: "Prompt added", id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding prompt:", error);
    return NextResponse.json(
      { error: "Failed to add prompt" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, type } = await request.json();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid or missing ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("BookStoreMD");
    const collection = db.collection("Prompts");

    // Deactivate all prompts of the same type
    await collection.updateMany({ type }, { $set: { active: false } });

    // Activate the selected prompt
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { active: true, updatedAt: new Date() } }
    );

    return NextResponse.json(
      { message: "Prompt marked as active", result },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error marking prompt as active:", error);
    return NextResponse.json(
      { error: "Failed to mark prompt as active" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid or missing ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("BookStoreMD");
    const collection = db.collection("Prompts");

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      { message: "Prompt deleted", result },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, type, keyword, content, isActive } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("BookStoreMD");
    const collection = db.collection("Prompts");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { type, keyword, content, isActive, updatedAt: new Date() } }
    );

    return NextResponse.json(
      { message: "Prompt updated successfully", result },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}
