import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ZONE = Deno.env.get('ECOUNT_ZONE') || 'CD'
const API_KEY = Deno.env.get('ECOUNT_API_KEY') || '365264eec5d604ca8ad5c3be3ccc1b6493'
const COM_CODE = Deno.env.get('ECOUNT_COM_CODE') || '81331'
const USER_ID = Deno.env.get('ECOUNT_USER_ID') || 'A11502'

interface ErpStockItem {
  WH_CD: string
  WH_DES: string
  PROD_CD: string
  PROD_DES: string
  PROD_SIZE_DES: string
  BAL_QTY: string
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

async function loginErp(): Promise<{ sessionId: string; hostUrl: string; setCookie: string }> {
  const url = `https://oapi${ZONE}.ecount.com/OAPI/V2/OAPILogin`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      COM_CODE,
      USER_ID,
      API_CERT_KEY: API_KEY,
      LAN_TYPE: 'ko-KR',
      ZONE,
    }),
  })

  const data = await response.json()
  if (String(data.Status) !== '200' || !data.Data?.Datas?.SESSION_ID) {
    throw new Error(data.Error?.Message || 'ERP Login Failed')
  }

  return {
    sessionId: data.Data.Datas.SESSION_ID,
    hostUrl: data.Data.Datas.HOST_URL || `oapi${ZONE}.ecount.com`,
    setCookie: data.Data.Datas.SET_COOKIE || '',
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchErpStockWithRetry(
  sessionId: string,
  hostUrl: string,
  setCookie: string,
  whCd: string,
  baseDate: string,
  maxRetries: number = 3
): Promise<ErpStockItem[]> {
  const url = `https://${hostUrl}/OAPI/V2/InventoryBalance/GetListInventoryBalanceStatusByLocation?SESSION_ID=${sessionId}`
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`  Retry ${attempt}/${maxRetries} for ${whCd}...`)
        await delay(2000 * attempt)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': setCookie,
        },
        body: JSON.stringify({ PROD_CD: '', WH_CD: whCd, BASE_DATE: baseDate }),
      })

      const text = await response.text()
      
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<')) {
        console.log(`  Warning: HTML response for ${whCd} (attempt ${attempt})`)
        if (attempt === maxRetries) {
          console.log(`  Failed after ${maxRetries} attempts for ${whCd}`)
          return []
        }
        continue
      }

      const data = JSON.parse(text)
      if (String(data.Status) !== '200') {
        console.log(`  Error for ${whCd}:`, data.Error?.Message)
        if (attempt === maxRetries) return []
        continue
      }

      return (data.Data?.Result || []).map((item: ErpStockItem) => ({
        ...item,
        WH_CD: whCd || item.WH_CD,
      }))
    } catch (err) {
      console.log(`  Exception for ${whCd} (attempt ${attempt}):`, err)
      if (attempt === maxRetries) return []
    }
  }
  
  return []
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting ERP sync...')
    const { sessionId, hostUrl, setCookie } = await loginErp()
    console.log('ERP login successful')

    const today = formatDate(new Date())
    const warehouses = ['W106', 'W104', 'W103', 'W102']
    
    let totalItems = 0
    let updatedCount = 0
    const errors: string[] = []
    const warehouseCounts: Record<string, number> = {}

    for (let i = 0; i < warehouses.length; i++) {
      const wh = warehouses[i]
      
      if (i > 0) {
        await delay(1500)
      }
      
      console.log(`Fetching ${wh}...`)
      const items = await fetchErpStockWithRetry(sessionId, hostUrl, setCookie, wh, today)
      console.log(`  Found ${items.length} items`)
      totalItems += items.length
      warehouseCounts[wh] = items.length

      for (const item of items) {
        const qty = Math.floor(Number(item.BAL_QTY || 0))
        
        const { error } = await supabase
          .from('rise_erp_inventory')
          .upsert({
            product_code: item.PROD_CD,
            warehouse_code: wh,
            warehouse_name: item.WH_DES || wh,
            product_name: item.PROD_DES || '',
            spec: item.PROD_SIZE_DES || '',
            qty,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'product_code,warehouse_code' })

        if (error) {
          errors.push(`${item.PROD_CD}_${wh}`)
        } else {
          updatedCount++
        }
      }
    }

    console.log(`Sync complete: ${updatedCount}/${totalItems} items`)
    console.log('Warehouse counts:', warehouseCounts)

    return new Response(
      JSON.stringify({
        success: true,
        count: updatedCount,
        fetchedCount: totalItems,
        warehouseCounts,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
