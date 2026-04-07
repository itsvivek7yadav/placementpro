function normalizeJobType(jobType) {
  const normalized = String(jobType || '').trim().toUpperCase();
  if (normalized === 'INTERNSHIP+PPO') return 'INTERNSHIP_PPO';
  return normalized;
}

function toDatabaseJobType(jobType) {
  const normalized = normalizeJobType(jobType);
  if (normalized === 'INTERNSHIP_PPO') return 'INTERNSHIP+PPO';
  return normalized;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function toBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function validateAndNormalizeCompensation(payload = {}) {
  const jobType = normalizeJobType(payload.job_type);
  const ctcDisclosed = toBoolean(payload.ctc_disclosed);
  const ppoCtcDisclosed = toBoolean(payload.ppo_ctc_disclosed);

  const normalized = {
    job_type: jobType,
    ctc_min: null,
    ctc_max: null,
    ctc_disclosed: false,
    stipend_amount: null,
    stipend_period: null,
    ppo_ctc_min: null,
    ppo_ctc_max: null,
    ppo_ctc_disclosed: false
  };

  if (!['FTE', 'INTERNSHIP', 'INTERNSHIP_PPO'].includes(jobType)) {
    return { error: 'job_type must be FTE, INTERNSHIP, or INTERNSHIP_PPO' };
  }

  if (jobType === 'FTE') {
    normalized.ctc_disclosed = ctcDisclosed;
    if (ctcDisclosed) {
      normalized.ctc_min = toNullableNumber(payload.ctc_min);
      normalized.ctc_max = toNullableNumber(payload.ctc_max);
      if (!Number.isFinite(normalized.ctc_min) || !Number.isFinite(normalized.ctc_max)) {
        return { error: 'CTC min and max are required when CTC is disclosed' };
      }
      if (normalized.ctc_min > normalized.ctc_max) {
        return { error: 'CTC min cannot be greater than CTC max' };
      }
    }
    return { value: normalized };
  }

  normalized.stipend_amount = toNullableNumber(payload.stipend_amount);
  normalized.stipend_period = 'MONTHLY';

  if (!Number.isFinite(normalized.stipend_amount) || normalized.stipend_amount <= 0) {
    return { error: 'Stipend amount is required' };
  }

  if (jobType === 'INTERNSHIP') {
    return { value: normalized };
  }

  normalized.ppo_ctc_disclosed = ppoCtcDisclosed;
  if (ppoCtcDisclosed) {
    normalized.ppo_ctc_min = toNullableNumber(payload.ppo_ctc_min);
    normalized.ppo_ctc_max = toNullableNumber(payload.ppo_ctc_max);

    if (!Number.isFinite(normalized.ppo_ctc_min) || !Number.isFinite(normalized.ppo_ctc_max)) {
      return { error: 'PPO CTC min and max are required when PPO CTC is disclosed' };
    }

    if (normalized.ppo_ctc_min > normalized.ppo_ctc_max) {
      return { error: 'PPO CTC min cannot be greater than PPO CTC max' };
    }
  }

  return { value: normalized };
}

function getPlacementPackageFromDrive(drive = {}) {
  const jobType = normalizeJobType(drive.job_type);

  if (jobType === 'FTE') {
    if (!drive.ctc_disclosed) return null;
    return drive.ctc_max ?? drive.ctc_min ?? null;
  }

  if (jobType === 'INTERNSHIP_PPO') {
    if (!drive.ppo_ctc_disclosed) return null;
    return drive.ppo_ctc_max ?? drive.ppo_ctc_min ?? null;
  }

  return null;
}

function formatCompensationLabel(drive = {}) {
  const jobType = normalizeJobType(drive.job_type);

  if (jobType === 'FTE') {
    if (!drive.ctc_disclosed) return 'CTC not disclosed';
    if (drive.ctc_min != null && drive.ctc_max != null) return `${drive.ctc_min} - ${drive.ctc_max} LPA`;
    if (drive.ctc_min != null) return `${drive.ctc_min} LPA`;
    return 'CTC not disclosed';
  }

  if (jobType === 'INTERNSHIP') {
    if (drive.stipend_amount == null) return 'Stipend not disclosed';
    return `Rs. ${drive.stipend_amount} / ${String(drive.stipend_period || 'MONTHLY').toLowerCase()}`;
  }

  if (jobType === 'INTERNSHIP_PPO') {
    const stipendLabel = drive.stipend_amount != null
      ? `Stipend: Rs. ${drive.stipend_amount} / ${String(drive.stipend_period || 'MONTHLY').toLowerCase()}`
      : 'Stipend not disclosed';

    if (!drive.ppo_ctc_disclosed) {
      return `${stipendLabel} | PPO CTC not disclosed`;
    }

    const ppoLabel = drive.ppo_ctc_min != null && drive.ppo_ctc_max != null
      ? `PPO: ${drive.ppo_ctc_min} - ${drive.ppo_ctc_max} LPA`
      : drive.ppo_ctc_min != null
        ? `PPO: ${drive.ppo_ctc_min} LPA`
        : 'PPO CTC not disclosed';

    return `${stipendLabel} | ${ppoLabel}`;
  }

  return 'Not disclosed';
}

module.exports = {
  normalizeJobType,
  toDatabaseJobType,
  validateAndNormalizeCompensation,
  getPlacementPackageFromDrive,
  formatCompensationLabel
};
