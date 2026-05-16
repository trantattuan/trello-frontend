import client from './client'

export const createCard = (listId: string, title: string) =>
  client.post('/cards', { listId, title }).then((r) => r.data)

export const updateCard = (id: string, data: Record<string, unknown>) =>
  client.put(`/cards/${id}`, data).then((r) => r.data)

export const moveCard = (id: string, listId: string, position: number) =>
  client.put(`/cards/${id}/move`, { listId, position }).then((r) => r.data)

export const deleteCard = (id: string) => client.delete(`/cards/${id}`)

export const getComments = (cardId: string) =>
  client.get(`/cards/${cardId}/comments`).then((r) => r.data)

export const addComment = (cardId: string, body: string) =>
  client.post(`/cards/${cardId}/comments`, { body }).then((r) => r.data)

export const createChecklist = (cardId: string, title: string) =>
  client.post(`/cards/${cardId}/checklists`, { title }).then((r) => r.data)

export const addChecklistItem = (checklistId: string, text: string) =>
  client.post(`/checklists/${checklistId}/items`, { text }).then((r) => r.data)

export const updateChecklistItem = (id: string, isDone: boolean) =>
  client.put(`/checklist-items/${id}`, { isDone }).then((r) => r.data)

export const uploadAttachment = (cardId: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return client.post(`/cards/${cardId}/attachments`, form).then((r) => r.data)
}

export const getAttachmentUrl = (id: string) =>
  client.get<{ url: string; filename: string }>(`/attachments/${id}/url`).then((r) => r.data)

export const assignMember = (cardId: string, userId: string) =>
  client.post(`/cards/${cardId}/members`, { userId })

export const removeMember = (cardId: string, userId: string) =>
  client.delete(`/cards/${cardId}/members/${userId}`)

export const toggleLabel = (cardId: string, labelId: string, active: boolean) =>
  active
    ? client.post(`/cards/${cardId}/labels`, { labelId })
    : client.delete(`/cards/${cardId}/labels/${labelId}`)
