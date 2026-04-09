import React, { useEffect, useState } from "react"

interface AssetOverviewPanelProps {
  assetId: string
}

interface AssetOverview {
  name: string
  priceUsd: number
  supply: number
  holders: number
}

export const AssetOverviewPanel: React.FC<AssetOverviewPanelProps> = ({ assetId }) => {
  const [info, setInfo] = useState<AssetOverview | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchInfo() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/assets/${assetId}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch asset: ${res.status}`)
      }
      const json = (await res.json()) as AssetOverview
      setInfo(json)
    } catch (err: any) {
      setError(err.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInfo()
  }, [assetId])

  if (loading) {
    return <div>Loading asset overview...</div>
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 rounded shadow text-red-700">
        <p>Error: {error}</p>
        <button
          onClick={fetchInfo}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!info) {
    return <div>No data available</div>
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Asset Overview</h2>
      <p><strong>ID:</strong> {assetId}</p>
      <p><strong>Name:</strong> {info.name}</p>
      <p><strong>Price (USD):</strong> ${info.priceUsd.toFixed(2)}</p>
      <p><strong>Circulating Supply:</strong> {info.supply.toLocaleString()}</p>
      <p><strong>Holders:</strong> {info.holders.toLocaleString()}</p>
      <button
        onClick={fetchInfo}
        className="mt-3 px-4 py-1 bg-blue-600 text-white rounded"
      >
        Refresh
      </button>
    </div>
  )
}

export default AssetOverviewPanel
