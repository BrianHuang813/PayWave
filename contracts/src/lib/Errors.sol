// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// PayWave Custom Errors
// Centralized error definitions for all PayWave contracts

// Role-based access errors
error E_NOT_ISSUER();
error E_NOT_GOV();
error E_NOT_GATE();
error E_NOT_OWNER();
error E_NOT_WRAPPER();
error E_NOT_PAYROLL();

// Payslip errors
error E_INVALID_PERIOD();
error E_PAYSLIP_NOT_FOUND();
error E_BAD_STATUS();
error E_ALREADY_PAID();
error E_ALREADY_SET();

// Case errors
error E_CASE_NOT_FOUND();
error E_CASE_LOCKED();
error E_CASE_NOT_APPROVED();
error E_CASE_EXECUTED();

// Treasury / Token errors
error E_INSUFFICIENT_TREASURY();
error E_INSUFFICIENT_BALANCE();
error E_INVALID_AMOUNT();
error E_INVALID_ADDRESS();

// Transfer errors
error E_TRANSFER_FAILED();
error E_APPROVAL_FAILED();
