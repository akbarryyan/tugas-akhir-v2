-- Remap existing NETRAL rows to POSITIF as a temporary placeholder so the
-- ENUM shrink below does not fail. After deploying the retrained binary
-- model, run the "Reanalyze" feature in /admin/feedback so these rows get a
-- real POSITIF/NEGATIF prediction instead of this placeholder value.
UPDATE `SentimentAnalysis` SET `autoLabel` = 'POSITIF' WHERE `autoLabel` = 'NETRAL';
UPDATE `SentimentAnalysis` SET `finalLabel` = 'POSITIF' WHERE `finalLabel` = 'NETRAL';
UPDATE `SentimentAnalysis` SET `manualLabel` = 'POSITIF' WHERE `manualLabel` = 'NETRAL';

-- AlterTable
ALTER TABLE `SentimentAnalysis`
  MODIFY `autoLabel` ENUM('POSITIF', 'NEGATIF') NOT NULL,
  MODIFY `manualLabel` ENUM('POSITIF', 'NEGATIF') NULL,
  MODIFY `finalLabel` ENUM('POSITIF', 'NEGATIF') NOT NULL;
