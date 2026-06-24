/**
 * db/modelAsset.ts
 * CRUD operations for downloaded model assets on the device.
 */

import { getDb } from "./localDb";
import { LocalModelAsset } from "../types/model.types";
import { v4 as uuidv4 } from "uuid";
import "react-native-get-random-values";

// ─────────────────────────────────────────────────────────────────
// Write operations
// ─────────────────────────────────────────────────────────────────

export const saveModelAsset = async (
  asset: Omit<LocalModelAsset, "id" | "isActive" | "downloadedAt">
): Promise<LocalModelAsset> => {
  const db = getDb();
  
  // Mark all existing models for this section as inactive
  await db.runAsync(
    `UPDATE model_assets SET is_active = 0 WHERE section_id = ?`,
    [asset.sectionId]
  );

  const fullAsset: LocalModelAsset = {
    id: uuidv4(),
    isActive: true,
    downloadedAt: new Date().toISOString(),
    ...asset,
  };

  await db.runAsync(
    `INSERT INTO model_assets
       (id, backbone_version, classifier_version, section_id,
        backbone_path, classifier_path, is_active, downloaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fullAsset.id,
      fullAsset.backboneVersion,
      fullAsset.classifierVersion,
      fullAsset.sectionId,
      fullAsset.backbonePath,
      fullAsset.classifierPath,
      fullAsset.isActive ? 1 : 0,
      fullAsset.downloadedAt,
    ]
  );

  return fullAsset;
};

// ─────────────────────────────────────────────────────────────────
// Read operations
// ─────────────────────────────────────────────────────────────────

export const getActiveModelAsset = async (
  sectionId: string
): Promise<LocalModelAsset | null> => {
  const db = getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM model_assets
     WHERE section_id = ? AND is_active = 1
     LIMIT 1`,
    [sectionId]
  );
  return row ? mapModelAsset(row) : null;
};

export const getAllModelAssets = async (): Promise<LocalModelAsset[]> => {
  const db = getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM model_assets ORDER BY downloaded_at DESC`
  );
  return rows.map(mapModelAsset);
};

// ─────────────────────────────────────────────────────────────────
// Row mapper
// ─────────────────────────────────────────────────────────────────

const mapModelAsset = (row: any): LocalModelAsset => ({
  id: row.id,
  backboneVersion: row.backbone_version,
  classifierVersion: row.classifier_version,
  sectionId: row.section_id,
  backbonePath: row.backbone_path,
  classifierPath: row.classifier_path,
  isActive: row.is_active === 1,
  downloadedAt: row.downloaded_at,
});
