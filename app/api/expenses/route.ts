import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { listExpenses, createExpense, updateExpense, deleteExpense, getExpenseSummary } from '@/services/expenses-service';
import { ServiceError } from '@/services/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const farmId = searchParams.get('farmId');
    const summary = searchParams.get('summary') === 'true';

    const supabase = await createClient();

    if (summary) {
      const expenseSummary = await getExpenseSummary(supabase, { farmId });
      return NextResponse.json({ success: true, summary: expenseSummary });
    }

    const expenses = await listExpenses(supabase, { farmId });

    return NextResponse.json({ success: true, expenses });
  } catch (error: any) {
    console.error('Get expenses error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { farmId, category, type, amount, description, occurredOn } = await req.json();

    if (!category || !type || amount === undefined || amount === null || !occurredOn) {
      return NextResponse.json({ error: 'Category, type, amount, and occurred date are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const expense = await createExpense(supabase, user, { farmId, category, type, amount, description, occurredOn });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('Create expense error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, farmId, category, type, amount, description, occurredOn } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const expense = await updateExpense(supabase, user, { id, farmId, category, type, amount, description, occurredOn });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('Update expense error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    await deleteExpense(supabase, id);

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('Delete expense error:', error);
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
