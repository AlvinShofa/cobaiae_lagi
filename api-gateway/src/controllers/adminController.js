// File: api-gateway/src/controllers/adminController.js
const asyncHandler = require('express-async-handler');
const { borrowingClient, itemClient, notificationClient } = require('../config/grpcClients');
const { grpcCall } = require('./helper/grpcHelper');

// @desc    Admin: Lihat semua request peminjaman
// @route   GET /api/admin/borrowings
// @access  Admin
const getAllBorrowings = asyncHandler(async (req, res) => {
  const { status_filter } = req.query;
  const response = await grpcCall(borrowingClient, 'GetAllBorrowings', {
    status_filter: status_filter || '',
  });
  res.status(200).json(response.borrow_requests);
});

// @desc    Admin: Menyetujui request peminjaman
// @route   POST /api/admin/borrowings/approve
// @access  Admin
const approveBorrowing = asyncHandler(async (req, res) => {
  const { borrowing_id, admin_notes } = req.body;
  const admin_id = req.user.id;

  // 1. Update status di borrowing-service
  const response = await grpcCall(borrowingClient, 'ApproveBorrowing', {
    borrowing_id,
    admin_id,
    admin_notes: admin_notes || 'Disetujui',
  });
  
  const borrowRequest = response.borrow_request;

  // 2. Ambil data item (untuk stok saat ini)
  const itemData = await grpcCall(itemClient, 'GetItem', { id: borrowRequest.item_id });
  
  // --- PERBAIKAN BUG DI SINI ---
  // Kita akses 'itemData.item.available_quantity', bukan 'itemData.available_quantity'
  const newAvailableQuantity = itemData.item.available_quantity - borrowRequest.quantity;
  // -----------------------------

  // 3. Kurangi stok di item-service
  await grpcCall(itemClient, 'UpdateItem', {
    id: borrowRequest.item_id,
    available_quantity: newAvailableQuantity // Kirim stok yang sudah dihitung
  });

  // 4. Kirim notifikasi ke user
  await grpcCall(notificationClient, 'SendNotification', {
      user_id: borrowRequest.user_id,
      message: `Peminjaman Anda untuk ${itemData.item.name} (ID: ${borrowRequest.id}) telah disetujui.`,
      type: 'BORROW_APPROVED'
  });

  res.status(200).json(borrowRequest);
});

// @desc    Admin: Menolak request peminjaman
// @route   POST /api/admin/borrowings/reject
// @access  Admin
const rejectBorrowing = asyncHandler(async (req, res) => {
    const { borrowing_id, admin_notes } = req.body;
    const admin_id = req.user.id;

    const response = await grpcCall(borrowingClient, 'RejectBorrowing', {
        borrowing_id,
        admin_id,
        admin_notes: admin_notes || 'Ditolak',
    });
    
    const borrowRequest = response.borrow_request;
    
    // Tidak ada perubahan stok, langsung kirim notif
    await grpcCall(notificationClient, 'SendNotification', {
        user_id: borrowRequest.user_id,
        message: `Mohon maaf, peminjaman Anda (ID: ${borrowRequest.id}) ditolak. Alasan: ${admin_notes || 'N/A'}`,
        type: 'BORROW_REJECTED'
    });

    res.status(200).json(borrowRequest);
});

// @desc    Admin: Menandai barang telah kembali
// @route   POST /api/admin/borrowings/return
// @access  Admin
const markAsReturnedByAdmin = asyncHandler(async (req, res) => {
    const { borrowing_id, admin_notes } = req.body;
    const admin_id = req.user.id; 

    // 1. Update status di borrowing-service
    const response = await grpcCall(borrowingClient, 'ReturnItem', {
        borrowing_id,
        user_id: admin_id,
        admin_notes: admin_notes || 'Dikembalikan oleh admin'
    });
    
    const borrowRequest = response.borrow_request;

    // 2. Ambil data item
    const itemData = await grpcCall(itemClient, 'GetItem', { id: borrowRequest.item_id });
    
    // --- PERBAIKAN BUG DI SINI ---
    // Kita akses 'itemData.item.available_quantity', bukan 'itemData.available_quantity'
    const newAvailableQuantity = itemData.item.available_quantity + borrowRequest.quantity;
    // -----------------------------

    // 3. Kembalikan stok ke item-service
    await grpcCall(itemClient, 'UpdateItem', {
        id: borrowRequest.item_id,
        available_quantity: newAvailableQuantity // Kirim stok yang sudah dihitung
    });
    
    res.status(200).json(borrowRequest);
});

// @desc    Admin: Lihat riwayat
// @route   GET /api/admin/history
// @access  Admin
const getHistory = asyncHandler(async (req, res) => {
    const response = await grpcCall(borrowingClient, 'GetHistory', {
        // tambahkan filter jika perlu dari req.query
    });
    res.status(200).json(response.borrow_requests);
});

module.exports = {
  getAllBorrowings,
  approveBorrowing,
  rejectBorrowing,
  markAsReturnedByAdmin,
  getHistory,
};