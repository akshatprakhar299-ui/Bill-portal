import api from "./api";

export async function getMyBills() {
  const { data } = await api.get("/bills/my");
  return data;
}

export async function getPendingExecutiveBills() {
  const { data } = await api.get("/bills/pending-executive");
  return data;
}

export async function getPendingAdminBills() {
  const { data } = await api.get("/bills/pending-admin");
  return data;
}

export async function getAllBills() {
  const { data } = await api.get("/bills/all");
  return data;
}

export async function uploadBill(formData) {
  const { data } = await api.post("/bills/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export async function approveExecutive(id) {
  const { data } = await api.post(`/bills/${id}/approve-executive`);
  return data;
}

export async function rejectExecutive(id, reason) {
  const { data } = await api.post(`/bills/${id}/reject-executive`, {
    reason,
  });
  return data;
}

export async function approveAdmin(id) {
  const { data } = await api.post(`/bills/${id}/approve-admin`);
  return data;
}

export async function rejectAdmin(id, reason) {
  const { data } = await api.post(`/bills/${id}/reject-admin`, {
    reason,
  });
  return data;
}

export async function deleteBill(id) {
  const { data } = await api.delete(`/bills/${id}`);
  return data;
}

export function billFileUrl(id) {
  return `${api.defaults.baseURL}/bills/${id}/file`;
}