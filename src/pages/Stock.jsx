import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tag,
  message,
} from "antd";
import { StopOutlined, AlertOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import Topbar from "../components/layout/TopBar";
import "../styles/Stock.css";

const API_BASE = "http://localhost:5000/api";

const categoryOptions = [
  "Fruits",
  "Veggies",
  "Grains",
  "Dairy",
  "Meat",
  "Seafood",
  "Beverages",
  "Spices",
  "Frozen",
  "Packaging",
  "Others",
];

const unitOptions = ["kg", "g", "l", "ml", "pcs", "pack", "box", "bottle"];

const statusTag = {
  in_stock: "green",
  low_stock: "orange",
  out_of_stock: "red",
  expiring_soon: "magenta",
};

const Stock = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchStock = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/stock`);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      message.error("Failed to load stock items");
      console.error("Failed to fetch stock:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const handleMarkOutOfStock = async (itemId) => {
    try {
      await axios.patch(`${API_BASE}/stock/${itemId}`, {
        status: "out_of_stock",
      });
      message.success("Item marked as out of stock");
      fetchStock();
    } catch (error) {
      message.error("Failed to update item");
    }
  };

  const handleMarkAsReorder = async (itemId) => {
    try {
      await axios.patch(`${API_BASE}/stock/${itemId}`, {
        status: "low_stock",
      });
      message.success("Item marked for reorder");
      fetchStock();
    } catch (error) {
      message.error("Failed to update item");
    }
  };

  const openAddModal = () => {
    form.resetFields();
    form.setFieldsValue({
      unit: "kg",
      category: "Fruits",
      quantity: 0,
      costPrice: 0,
    });
    setOpen(true);
  };

  const closeAddModal = () => {
    setOpen(false);
  };

  const handleAddStock = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        expiryDate: values.expiryDate ? values.expiryDate.toISOString() : null,
      };

      await axios.post(`${API_BASE}/stock`, payload);
      message.success("Stock item added successfully");
      closeAddModal();
      fetchStock();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      message.error(error.response?.data?.error || "Failed to add stock item");
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(() => {
    const total = items.length;
    const lowStock = items.filter((item) => item.status === "low_stock").length;
    const outOfStock = items.filter(
      (item) => item.status === "out_of_stock",
    ).length;
    const expiringSoon = items.filter(
      (item) => item.status === "expiring_soon",
    ).length;

    return { total, lowStock, outOfStock, expiringSoon };
  }, [items]);

  const columns = [
    {
      title: "Item",
      dataIndex: "name",
      key: "name",
      render: (value, record) => (
        <div>
          <strong>{value}</strong>
          <div className="stock-sub">SKU: {record.sku}</div>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "On Hand",
      key: "quantity",
      render: (_, record) => `${record.quantity} ${record.unit}`,
    },
    {
      title: "Cost",
      dataIndex: "costPrice",
      key: "costPrice",
      render: (value) => `₹${Number(value || 0).toFixed(2)}`,
    },
    {
      title: "Expiry",
      dataIndex: "expiryDate",
      key: "expiryDate",
      render: (value) =>
        value ? (
          dayjs(value).format("DD MMM YYYY")
        ) : (
          <span className="stock-sub">-</span>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag color={statusTag[value] || "default"}>
          {(value || "unknown").replaceAll("_", " ").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <div className="stock-actions-cell">
          <Popconfirm
            title="Mark for reorder?"
            description={`Mark "${record.name}" as low stock (reorder needed)?`}
            onConfirm={() => handleMarkAsReorder(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              warning
              size="small"
              icon={<AlertOutlined />}
              disabled={record.status === "low_stock"}
            >
              Mark Reorder
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Mark out of stock?"
            description={`Mark "${record.name}" as out of stock?`}
            onConfirm={() => handleMarkOutOfStock(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<StopOutlined />}
              disabled={record.status === "out_of_stock"}
            >
              Out of Stock
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="main stock-main">
      <Topbar />

      <div className="stock-hero">
        <div>
          <h2>Stock Management</h2>
          <p>Admin inventory reference with reorder and expiry insights.</p>
        </div>
        <Button type="primary" onClick={openAddModal}>
          Add Stock Item
        </Button>
      </div>

      <div className="stock-stats">
        <div className="stock-stat-card">
          <p>Total SKUs</p>
          <h3>{counts.total}</h3>
        </div>
        <div className="stock-stat-card warning">
          <p>Low Stock</p>
          <h3>{counts.lowStock}</h3>
        </div>
        <div className="stock-stat-card danger">
          <p>Out of Stock</p>
          <h3>{counts.outOfStock}</h3>
        </div>
        <div className="stock-stat-card alert">
          <p>Expiring Soon</p>
          <h3>{counts.expiringSoon}</h3>
        </div>
      </div>

      <div className="stock-table-wrap">
        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{ pageSize: 8 }}
        />
      </div>

      <Modal
        title="Add Stock Item"
        open={open}
        onCancel={closeAddModal}
        onOk={handleAddStock}
        okText="Save Item"
        confirmLoading={saving}
        width={780}
      >
        <Form form={form} layout="vertical">
          <div className="stock-form-grid">
            <Form.Item
              label="Item Name"
              name="name"
              rules={[{ required: true, message: "Please enter item name" }]}
            >
              <Input placeholder="Example: Tomato" />
            </Form.Item>

            <Form.Item label="SKU (Optional)" name="sku">
              <Input placeholder="Auto-generated if empty" />
            </Form.Item>

            <Form.Item
              label="Category"
              name="category"
              rules={[{ required: true, message: "Select category" }]}
            >
              <Select
                options={categoryOptions.map((value) => ({
                  label: value,
                  value,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Unit"
              name="unit"
              rules={[{ required: true, message: "Select unit" }]}
            >
              <Select
                options={unitOptions.map((value) => ({ label: value, value }))}
              />
            </Form.Item>

            <Form.Item
              label="Current Quantity"
              name="quantity"
              rules={[{ required: true, message: "Enter quantity" }]}
            >
              <InputNumber min={0} className="stock-full" />
            </Form.Item>

            <Form.Item label="Unit Cost (INR)" name="costPrice">
              <InputNumber min={0} className="stock-full" />
            </Form.Item>
            {/* 
            <Form.Item label="Supplier Name" name="supplierName">
              <Input placeholder="Supplier or vendor name" />
            </Form.Item>

            <Form.Item label="Supplier Contact" name="supplierContact">
              <Input placeholder="Phone or email" />
            </Form.Item>

            <Form.Item label="Storage Location" name="storageLocation">
              <Input placeholder="Store room / fridge / rack" />
            </Form.Item>

            <Form.Item label="Batch Number" name="batchNo">
              <Input placeholder="Batch / lot number" />
            </Form.Item>

            <Form.Item label="Expiry Date" name="expiryDate">
              <DatePicker className="stock-full" format="DD-MM-YYYY" />
            </Form.Item> */}

            {/* <Form.Item label="Notes" name="notes" className="stock-notes">
              <Input.TextArea
                rows={3}
                placeholder="Any handling/storage notes"
              />
            </Form.Item> */}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Stock;
