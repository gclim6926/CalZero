function ExportButton({ calibrations, device }) {
  
  const exportJSON = () => {
    const data = {
      device: device,
      exportedAt: new Date().toISOString(),
      calibrations: calibrations
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${device?.device_name || 'calibrations'}_export.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    const joints = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper']
    
    let csv = 'id,notes,created_at'
    joints.forEach(j => {
      csv += `,${j}_homing,${j}_min,${j}_max`
    })
    csv += '\n'

    calibrations.forEach(c => {
      csv += `${c.id},"${c.notes}","${c.created_at}"`
      joints.forEach(j => {
        const data = c.calibration_data[j] || {}
        csv += `,${data.homing_offset || ''},${data.range_min || ''},${data.range_max || ''}`
      })
      csv += '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${device?.device_name || 'calibrations'}_export.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportJSON}
        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
      >
        📥 JSON
      </button>
      <button
        onClick={exportCSV}
        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
      >
        📥 CSV
      </button>
    </div>
  )
}

export default ExportButton
