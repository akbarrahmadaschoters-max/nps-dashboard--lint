export default async (req: Request) => {
  const apiKey = process.env.AIRTABLE_API_KEY || process.env.VITE_AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID || process.env.VITE_AIRTABLE_BASE_ID
  const tableId = process.env.AIRTABLE_TABLE_ID || process.env.VITE_AIRTABLE_TABLE_ID

  if (!apiKey || !baseId || !tableId) {
    return Response.json(
      { error: "Airtable is not configured on the server." },
      { status: 500 }
    )
  }

  const url = new URL(req.url)
  const startDate = url.searchParams.get("startDate") || ""
  const endDate = url.searchParams.get("endDate") || ""

  const formulaParts: string[] = []
  if (startDate) formulaParts.push(`DATESTR({Submission Date}) >= '${startDate}'`)
  if (endDate) formulaParts.push(`DATESTR({Submission Date}) <= '${endDate}'`)
  const formula = formulaParts.length > 0 ? `AND(${formulaParts.join(",")})` : ""

  try {
    let allRecords: unknown[] = []
    let offset: string | undefined

    do {
      const params = new URLSearchParams({
        pageSize: "100",
        "sort[0][field]": "Submission Date",
        "sort[0][direction]": "desc",
      })
      if (formula) params.append("filterByFormula", formula)
      if (offset) params.append("offset", offset)

      const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?${params.toString()}`
      const res = await fetch(airtableUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        return Response.json(
          { error: errJson.error?.message || `Airtable HTTP error ${res.status}` },
          { status: res.status }
        )
      }

      const json = await res.json()
      allRecords = allRecords.concat(json.records || [])
      offset = json.offset
    } while (offset)

    return Response.json({ records: allRecords })
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Failed to fetch Airtable records." },
      { status: 500 }
    )
  }
}

export const config = {
  path: "/api/airtable-records",
}
