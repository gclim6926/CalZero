function ExportButton({ calibration, device }) {
  
  const exportJSON = () => {
    if (!calibration) return
    const data = {
      device: device,
      exportedAt: new Date().toISOString(),
      created_at: calibration.created_at,
      calibration_data: calibration.calibration_data
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date(calibration.created_at).toISOString().split('T')[0]
    a.download = `${device?.device_name || 'calibration'}_${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    if (!calibration) return
    const joints = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper']
    
    let csv = 'joint,homing_offset,range_min,range_max\n'
    joints.forEach(j => {
      const data = calibration.calibration_data[j] || {}
      csv += `${j},${data.homing_offset || ''},${data.range_min || ''},${data.range_max || ''}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date(calibration.created_at).toISOString().split('T')[0]
    a.download = `${device?.device_name || 'calibration'}_${dateStr}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportJSON}
        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition"
      >
        📥 JSON
      </button>
      <button
        onClick={exportCSV}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition"
      >
        📥 CSV
      </button>
    </div>
  )
}

export default ExportButton
