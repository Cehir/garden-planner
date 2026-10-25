/** Öffnet das Druckdokument in einem neuen Fenster und startet den Druckdialog. */
export function openPrintWindow(html: string): void {
  const w = window.open('', '_blank', 'width=920,height=760')
  if (!w) {
    alert('Drucken fehlgeschlagen: Der Browser hat das Fenster blockiert.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  setTimeout(() => {
    w.focus()
    w.print()
  }, 80)
  w.onafterprint = () => w.close()
}
