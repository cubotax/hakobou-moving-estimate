import { createClient } from '@supabase/supabase-js';

// 環境変数から取得（Fly.ioのシークレットに設定）
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Warning: Supabase credentials not configured');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function insertEstimate(estimate) {
  const { data, error } = await supabase
    .from('estimates')
    .insert({
      id: estimate.id,
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
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting estimate:', error);
    throw error;
  }

  return estimate.id;
}

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
 * 申込データを保存
 */
export async function insertApplication(application) {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      estimate_id: application.estimateId,
      pickup_address_detail: application.pickupAddressDetail || '',
      pickup_building: application.pickupBuilding || '',
      pickup_room: application.pickupRoom || '',
      delivery_address_detail: application.deliveryAddressDetail || '',
      delivery_building: application.deliveryBuilding || '',
      delivery_room: application.deliveryRoom || '',
      phone: application.phone || '',
      email: application.email || '',
      preferred_datetime_1: application.preferredDateTime1 || '',
      preferred_datetime_2: application.preferredDateTime2 || '',
      preferred_datetime_3: application.preferredDateTime3 || '',
      notes: application.notes || '',
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting application:', error);
    throw error;
  }

  return data?.id || null;
}

export default supabase;