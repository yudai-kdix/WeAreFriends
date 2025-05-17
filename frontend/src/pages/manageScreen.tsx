import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import axios from "axios";

// 識別項目の型定義
interface IdentificationItem {
  name: string;
  prompt: string;
  file: File | null;
}

// 初期値
const emptyItem: IdentificationItem = {
  name: "",
  prompt: "",
  file: null,
};

const ManageScreen: React.FC = () => {
  const [organization, setOrganization] = useState<string>("");
  const [items, setItems] = useState<IdentificationItem[]>([{ ...emptyItem }]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // 識別項目を追加
  const addItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

  // 各項目の値を更新
  const updateItem = (
    index: number,
    field: keyof IdentificationItem,
    value: any
  ) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  // ファイルドロップハンドラー
  const handleFileDrop = (
    index: number,
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith(".zip")) {
      updateItem(index, "file", file);
    } else {
      alert("ZIPファイルのみアップロード可能です");
    }
  };

  // ファイル選択ハンドラー
  const handleFileSelect = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith(".zip")) {
      updateItem(index, "file", file);
    } else if (file) {
      alert("ZIPファイルのみアップロード可能です");
      event.target.value = "";
    }
  };

  // フォーム送信ハンドラー
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // 入力検証
      if (!organization.trim()) {
        throw new Error("組織名を入力してください");
      }

      const invalidItems = items.filter(
        (item) => !item.name.trim() || !item.prompt.trim() || !item.file
      );

      if (invalidItems.length > 0) {
        throw new Error(
          "すべての項目を入力し、ファイルをアップロードしてください"
        );
      }

      // FormDataの作成
      const formData = new FormData();
      formData.append("organization", organization);

      // 項目データの準備
      const itemsData = items.map((item) => ({
        name: item.name,
        prompt: item.prompt,
      }));

      formData.append("items_json", JSON.stringify(itemsData));

      // ファイルの追加
      items.forEach((item, index) => {
        if (item.file) {
          formData.append(`file_${index}`, item.file);
        }
      });

      // APIエンドポイント (後で設定)
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

      // データ送信
      const response = await axios.post(`${API_URL}/extend_prompt`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("送信成功:", response.data);
      setSubmitStatus({
        type: "success",
        message: "情報が正常に送信されました！",
      });

      // フォームリセット
      setOrganization("");
      setItems([{ ...emptyItem }]);
    } catch (error: any) {
      console.error("送信エラー:", error);
      setSubmitStatus({
        type: "error",
        message: error.message || "データ送信中にエラーが発生しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        識別対象管理
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* 組織名入力 */}
          <TextField
            margin="normal"
            required
            fullWidth
            label="組織名"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            variant="outlined"
            sx={{ mb: 4 }}
          />

          {/* 識別項目のリスト */}
          {items.map((item, index) => (
            <Box
              key={index}
              sx={{
                p: 2,
                mb: 3,
                border: "1px solid #e0e0e0",
                borderRadius: 1,
              }}
            >
              <Typography variant="h6">識別対象 #{index + 1}</Typography>

              {/* 名前入力 */}
              <TextField
                margin="normal"
                required
                fullWidth
                label="識別対象名"
                value={item.name}
                onChange={(e) => updateItem(index, "name", e.target.value)}
                variant="outlined"
                sx={{ mb: 2 }}
              />

              {/* プロンプト入力 */}
              <TextField
                margin="normal"
                required
                fullWidth
                label="プロンプト"
                value={item.prompt}
                onChange={(e) => updateItem(index, "prompt", e.target.value)}
                variant="outlined"
                multiline
                rows={4}
                sx={{ mb: 2 }}
              />

              {/* ファイルアップロード */}
              <Box
                sx={{
                  border: "2px dashed #cccccc",
                  borderRadius: 2,
                  p: 3,
                  textAlign: "center",
                  bgcolor: "#f8f8f8",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "#f0f0f0",
                  },
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleFileDrop(index, e)}
                onClick={() =>
                  document.getElementById(`file-upload-${index}`)?.click()
                }
              >
                <input
                  id={`file-upload-${index}`}
                  type="file"
                  accept=".zip"
                  hidden
                  onChange={(e) => handleFileSelect(index, e)}
                />
                <CloudUploadIcon
                  sx={{ fontSize: 40, color: "primary.main", mb: 1 }}
                />
                <Typography>
                  {item.file
                    ? `選択済み: ${item.file.name}`
                    : "クリックまたはドラッグ&ドロップでZIPファイルをアップロード"}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  ※ZIPファイルのみ対応
                </Typography>
              </Box>
            </Box>
          ))}

          {/* 項目追加ボタン */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Button
              startIcon={<AddCircleOutlineIcon />}
              onClick={addItem}
              variant="outlined"
              color="primary"
            >
              識別対象を追加
            </Button>
          </Box>

          {/* 送信ボタン */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={isSubmitting}
            sx={{ mt: 2, mb: 2 }}
          >
            {isSubmitting ? "送信中..." : "送信する"}
          </Button>

          {/* 結果表示 */}
          {submitStatus && (
            <Alert severity={submitStatus.type} sx={{ mt: 2 }}>
              {submitStatus.message}
            </Alert>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ManageScreen;
