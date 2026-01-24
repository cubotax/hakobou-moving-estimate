import { createClient } from '@supabase/supabase-js';

// 環境変数から取得（Fly.ioのシークレットに設定）
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Warning: Supabase credentials not configured');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 見積もりデータを新規作成（INSERT）
 */
export async function insertEstimate(estimate) {
  const { data, error } = await supabase
    .from('estimates')
    .insert({
      id: estimate.id,
      browser_id: estimate.browserId || null,
      pickup_prefecture: estimate.pickupAddress?.prefecture || '',
      pickup_city: estimate.pickupAddress?.city || '',
      pickup_town: estimate.pickupAddress?.town || '',
      delivery_prefecture: estimate.deliveryAddress?.prefecture || '',
      delivery_city: estimate.deliveryAddress?.city || '',
      delivery_town: estimate.deliveryAddress?.town || '',
      pickup_date: estimate.dates?.pickupDate || '',
      delivery_date: estimate.dates?.deliveryDate || '',
      total_fee: estimate.totalFee || 0,
      distance_km: estimate.distanceKm || 0,
      floor_pickup: estimate.conditions?.floorPickup || 1,
      has_elevator_pickup: estimate.conditions?.hasElevatorPickup || false,
      floor_delivery: estimate.conditions?.floorDelivery || 1,
      has_elevator_delivery: estimate.conditions?.hasElevatorDelivery || false,
      needs_packing: estimate.conditions?.needsPacking || false,
      plan: estimate.plan || '',
      expressway_fee: estimate.expresswayFee || 0,
      pickup_time_slot: estimate.dates?.pickupTimeSlot || '',
      delivery_time_slot: estimate.dates?.deliveryTimeSlot || '',
      status: 'estimated',
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting estimate:', error);
    throw error;
  }

  return estimate.id;
}

/**
 * 見積もりにLINEユーザーIDを紐付け（UPDATE）
 */
export async function linkEstimate(estimateId, lineUserId) {
  const { data, error } = await supabase
    .from('estimates')
    .update({ line_user_id: lineUserId })
    .eq('id', estimateId)
    .select();

  if (error) {
    console.error('Error linking estimate:', error);
    throw error;
  }

  return data && data.length > 0;
}

/**
 * LINEユーザーIDから最新の見積もりを取得（SELECT）
 */
export async function getEstimateByLineUserId(lineUserId) {
  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('line_user_id', lineUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting estimate by line user id:', error);
  }

  return data || null;
}

/**
 * 見積もりIDから見積もりを取得（SELECT）
 */
export async function getEstimateById(estimateId) {
  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', estimateId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting estimate by id:', error);
  }

  return data || null;
}

/**
 * 見積もりに申込情報を追加（UPDATE）
 */
export async function updateEstimateWithApplication(estimateId, application) {
  const { data, error } = await supabase
    .from('estimates')
    .update({
      last_name: application.lastName || '',
      first_name: application.firstName || '',
      last_name_kana: application.lastNameKana || '',
      first_name_kana: application.firstNameKana || '',
      pickup_address_detail: application.pickupAddressDetail || '',
      pickup_building: application.pickupBuilding || '',
      delivery_address_detail: application.deliveryAddressDetail || '',
      delivery_building: application.deliveryBuilding || '',
      phone: application.phone || '',
      pickup_time_slot: application.pickupTimeSlot || '',
      delivery_time_slot: application.deliveryTimeSlot || '',
      notes: application.notes || '',
      status: 'applied',
      applied_at: new Date().toISOString(),
    })
    .eq('id', estimateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating estimate with application:', error);
    throw error;
  }

  return data;
}

/**
 * 見積もりを「相談中」ステータスに更新
 */
export async function updateEstimateToConsulting(estimateId) {
  const { data, error } = await supabase
    .from('estimates')
    .update({
      status: 'consulting',
      consulted_at: new Date().toISOString(),
    })
    .eq('id', estimateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating estimate to consulting:', error);
    throw error;
  }

  return data;
}

/**
 * 見積もりにStripe Session IDを保存
 */
export async function updateEstimatePaymentSession(estimateId, sessionId) {
  const { data, error } = await supabase
    .from('estimates')
    .update({
      stripe_session_id: sessionId,
    })
    .eq('id', estimateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment session:', error);
    throw error;
  }

  return data;
}

export default supabase;
