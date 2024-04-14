const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Định nghĩa schema
const articleSchema = new Schema({
  id: String,
  title: String,
  meta: {
    author: String,
    publish: Date,
  },
  summary: String,
  articleBodyContent: [Schema.Types.Mixed], // Sử dụng kiểu dữ liệu Mixed cho các đối tượng không có cấu trúc chính xác
  thumbnail: String,
});

// Tạo model từ schema
const Article = mongoose.model("Article", articleSchema);

module.exports = Article;
