import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, scans, scanResults, scanFindings, Scan, ScanResult, ScanFinding, InsertScan, InsertScanResult, InsertScanFinding } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Scan queries
 */
export async function createScan(scan: InsertScan): Promise<Scan | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.insert(scans).values(scan);
    return getScanById(scan.id);
  } catch (error) {
    console.error("[Database] Failed to create scan:", error);
    return null;
  }
}

export async function getScanById(scanId: string): Promise<Scan | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get scan:", error);
    return null;
  }
}

export async function getUserScans(userId: number): Promise<Scan[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(scans).where(eq(scans.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to get user scans:", error);
    return [];
  }
}

export async function updateScanStatus(
  scanId: string,
  status: Scan["status"],
  progress: number,
  currentStep?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const updateData: Record<string, unknown> = {
      status,
      progress,
      updatedAt: new Date(),
    };

    if (currentStep) {
      updateData.currentStep = currentStep;
    }

    if (status === "completed") {
      updateData.completedAt = new Date();
    }

    await db.update(scans).set(updateData).where(eq(scans.id, scanId));
  } catch (error) {
    console.error("[Database] Failed to update scan status:", error);
  }
}

export async function saveScanResults(
  scanId: string,
  results: InsertScanResult[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    if (results.length > 0) {
      await db.insert(scanResults).values(results);
    }
  } catch (error) {
    console.error("[Database] Failed to save scan results:", error);
  }
}

export async function saveScanFindings(
  scanId: string,
  findings: InsertScanFinding[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    if (findings.length > 0) {
      await db.insert(scanFindings).values(findings);
    }
  } catch (error) {
    console.error("[Database] Failed to save scan findings:", error);
  }
}

export async function getScanResults(scanId: string): Promise<ScanResult[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(scanResults).where(eq(scanResults.scanId, scanId));
  } catch (error) {
    console.error("[Database] Failed to get scan results:", error);
    return [];
  }
}

export async function getScanFindings(scanId: string): Promise<ScanFinding[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(scanFindings).where(eq(scanFindings.scanId, scanId));
  } catch (error) {
    console.error("[Database] Failed to get scan findings:", error);
    return [];
  }
}
