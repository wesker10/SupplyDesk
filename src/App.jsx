import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Building2,
  Clock3,
  CreditCard,
  FileText,
  LayoutDashboard,
  ListChecks,
  Moon,
  Search,
  Sun,
  Trash2,
} from 'lucide-react'
import {
  dashboardStats,
  filterOrders,
  formatCurrency,
  orders as seedOrders,
  paymentSummary,
  statuses,
  suppliers as seedSuppliers,
  updateOrder,
} from './talabatiLogic.js'
import {
  addPaymentApi,
  archiveOrderApi,
  createBudgetCategoryApi,
  createBudgetYearApi,
  deleteBudgetCategoryApi,
  createOrderApi,
  createSupplierApi,
  deleteSupplierApi,
  deleteOrderForeverApi,
  deletePaymentApi,
  fetchAuthStatusApi,
  fetchBudgetCategoriesApi,
  fetchBudgetYearsApi,
  fetchOrdersApi,
  fetchSettingsApi,
  fetchSuppliersApi,
  loginApi,
  logoutApi,
  restoreOrderApi,
  trashOrderApi,
  updateBudgetCategoryApi,
  updateBudgetYearApi,
  updateOrderApi,
  updatePaymentApi,
  updateSettingsApi,
  updateSupplierApi,
  sendTestEmailApi,
} from './apiClient.js'

const navItems = [
  { label: 'لوحة التحكم', icon: LayoutDashboard },
  { label: 'الموردون', icon: Building2 },
  { label: 'بنود الميزانية', icon: ListChecks },
  { label: 'الأرشيف', icon: Archive },
  { label: 'المحذوفات', icon: Trash2 },
  { label: 'إعدادات المسؤول', icon: CreditCard },
]

const paymentStatuses = ['لم تستحق', 'قيد الانتظار', 'مدفوعة', 'متأخرة']
const appVersion = '1.4.26'

const emailThemeOptions = [
  { id: 'talabati', name: 'ثيم البرنامج', hint: 'كريمي وذهبي مثل واجهة SupplyDesk', nameEn: 'App Theme', hintEn: 'Cream and gold like the SupplyDesk interface', colors: ['#efe7d8', '#7c5c2f', '#b58a4a'] },
  { id: 'white', name: 'أبيض واضح', hint: 'أعلى تباين للشبكات أو عملاء البريد الصارمين', nameEn: 'Clear White', hintEn: 'Highest contrast for restrictive email clients or networks', colors: ['#ffffff', '#111827', '#d1d5db'] },
  { id: 'black', name: 'أسود رسمي', hint: 'داكن احترافي للنصوص البيضاء الواضحة', nameEn: 'Formal Black', hintEn: 'Professional dark theme for clear white text', colors: ['#0f172a', '#f8fafc', '#334155'] },
  { id: 'sapphire', name: 'أزرق إداري', hint: 'رسمي وبارد للمراسلات الإدارية', nameEn: 'Administrative Blue', hintEn: 'Formal cool styling for administrative messages', colors: ['#eaf2ff', '#0f4c81', '#2563eb'] },
  { id: 'emerald', name: 'أخضر هادئ', hint: 'هادئ وواضح للمتابعة والاعتمادات', nameEn: 'Calm Green', hintEn: 'Calm and clear for follow-up and approvals', colors: ['#ecfdf5', '#065f46', '#10b981'] },
]

const englishUi = {
  'S': 'S',
  'SupplyDesk': 'SupplyDesk',
  'نظام المشتريات': 'Procurement System',
  'لوحة التحكم': 'Dashboard',
  'بنود الميزانية': 'Budget Lines',
  'الأرشيف': 'Archive',
  'المحذوفات': 'Deleted Items',
  'إعدادات المسؤول': 'Admin Settings',
  'القائمة الرئيسية': 'Main Navigation',
  'فاتح كريمي': 'Cream Light',
  'داكن رمادي': 'Graphite Dark',
  'تغيير المظهر': 'Change Theme',
  '+ طلب جديد': '+ New Request',
  'تعديل العنوان': 'Edit Title',
  'حفظ العنوان': 'Save Title',
  'إلغاء': 'Cancel',
  'إغلاق': 'Close',
  'طلبات نشطة، أرشيف مستقل، وسلة محذوفات آمنة': 'Active requests, independent archive, and secure deleted-items area',
  'إدارة طلبات المشتريات بوضوح وتحكّم': 'Procurement Requests, Clear Control',
  'إجمالي قيمة الطلبات النشطة': 'Total Active Request Value',
  'المدفوع': 'Paid',
  'ميزانية السنة': 'Annual Budget',
  'السنة': 'Year',
  'المستهلك': 'Consumed',
  'المتبقي': 'Remaining',
  'تعديل الميزانية من صفحة بنود الميزانية.': 'Edit the budget from the Budget Lines page.',
  'إجمالي الطلبات': 'Total Requests',
  'طلبات نشطة': 'Active Requests',
  'قيد الإجراء': 'In Progress',
  'غير مكتملة': 'Not Completed',
  'مدفوعة جزئيًا': 'Partially Paid',
  'تحتاج متابعة مالية': 'Requires Financial Follow-up',
  'طلبات محفوظة خارج النشط': 'Requests stored outside active work',
  'قابلة للاسترجاع أو الحذف النهائي': 'Can be restored or permanently deleted',
  'المتابعة اليومية': 'Daily Follow-up',
  'طلبات المشتريات': 'Procurement Requests',
  'الكل': 'All',
  'بانتظار LPO': 'Awaiting LPO',
  'قيد الدفع': 'Payment in Progress',
  'الطلب': 'Request',
  'المورد': 'Supplier',
  'المسؤول': 'Owner',
  'المسؤولون': 'Owners',
  'الحالة': 'Status',
  'الدفع / المتبقي': 'Payment / Remaining',
  'إجراء': 'Action',
  'تفاصيل': 'Details',
  'أرشفة': 'Archive',
  'مسح': 'Delete',
  'استرجاع': 'Restore',
  'حذف نهائي': 'Delete Permanently',
  'سنة الأرشيف': 'Archive Year',
  'التسليم المتوقع:': 'Expected delivery:',
  'غير محدد': 'Not specified',
  'تفاصيل الطلب': 'Request Details',
  'بيانات الطلب': 'Request Information',
  'عدّل براحتك ثم احفظ': 'Edit as needed, then save',
  'اسم الطلب': 'Request Name',
  'رقم الطلب': 'Request Number',
  'رقم الدفعة': 'Payment Number',
  'رقم LPO': 'LPO Number',
  'مقدم الطلب': 'Requester',
  'ملاحظة': 'Note',
  'سنة الميزانية': 'Budget Year',
  'بند الميزانية': 'Budget Line',
  'بدون بند': 'No Budget Line',
  'القيمة الإجمالية': 'Total Value',
  'الأولوية': 'Priority',
  'تاريخ التسليم المتوقع': 'Expected Delivery Date',
  'حفظ بيانات الطلب': 'Save Request Information',
  'الدفعات': 'Payments',
  'مدفوع': 'paid',
  'اسم الدفعة': 'Payment Name',
  'المبلغ': 'Amount',
  '+ إضافة دفعة': '+ Add Payment',
  'حذف': 'Delete',
  'ملاحظات': 'Notes',
  'ملاحظاتك اليدوية فقط': 'Manual notes only',
  'اكتب ملاحظاتك هنا...': 'Write your notes here...',
  'حفظ الملاحظات': 'Save Notes',
  'حفظ التغييرات': 'Save Changes',
  'طلب جديد': 'New Request',
  'تعديل الطلب': 'Edit Request',
  'إدارة الطلبات': 'Request Management',
  'حفظ الطلب': 'Save Request',
  'عدد الدفعات': 'Number of Payments',
  'دفعة': 'Payment',
  'إدارة الميزانية السنوية': 'Annual Budget Management',
  'بنود الميزانية لسنة': 'Budget Lines for',
  'عدّل ميزانية السنة من البطاقة الواضحة بالأسفل، ثم وزّعها على البنود.': 'Edit the annual budget from the card below, then allocate it across budget lines.',
  'عرض سنة': 'View Year',
  'الموزع على البنود': 'Allocated to Lines',
  'غير موزع': 'Unallocated',
  'تعديل ميزانية السنة الحالية': 'Edit Current Year Budget',
  'اكتب الرقم هنا واضغط حفظ. هذه هي الميزانية التي تظهر في لوحة التحكم.': 'Enter the amount here and save. This is the budget shown on the dashboard.',
  'مبلغ ميزانية': 'Budget Amount',
  'حفظ ميزانية': 'Save Budget',
  'إضافة سنة مالية جديدة': 'Add New Fiscal Year',
  'سنة مستقلة': 'Independent Year',
  'اكتب السنة الجديدة وميزانيتها. لن يتم تغيير أرقام السنوات السابقة.': 'Enter the new year and its budget. Previous years will not be changed.',
  'السنة الجديدة': 'New Year',
  'ميزانية السنة الجديدة': 'New Year Budget',
  '+ إنشاء سنة مالية': '+ Create Fiscal Year',
  'إضافة بند على سنة': 'Add Line to Year',
  'بنود الصرف': 'Spending Lines',
  'اسم البند': 'Line Name',
  'المبلغ المخصص': 'Allocated Amount',
  'المبلغ المخصص للبند': 'Line Allocated Amount',
  '+ إضافة بند': '+ Add Line',
  'البند': 'Line',
  'المخصص': 'Allocated',
  'عدد الطلبات': 'Request Count',
  'مسح البند': 'Delete Line',
  'لا توجد بنود لهذه السنة بعد.': 'There are no budget lines for this year yet.',
  'الأرشيف حسب سنة إنشاء الطلب': 'Archive by Request Creation Year',
  'الطلبات المؤرشفة': 'Archived Requests',
  'السنة الافتراضية مبنية على تاريخ إنشاء الطلب. إذا احتجت تنقل طلب بين السنوات، غيّر سنة الأرشيف من القائمة داخل صف الطلب.': 'The default year is based on request creation date. To move a request between years, change the archive year from its row.',
  'لا توجد طلبات مؤرشفة ضمن هذا التصفية.': 'No archived requests match this filter.',
  'طلب': 'request(s)',
  'طلبات': 'Requests',
  'لا توجد طلبات في هذا القسم.': 'No requests in this section.',
  'سلة المحذوفات - يمكن الاسترجاع خلال 30 يوم': 'Deleted Items - can be restored within 30 days',
  'طلبات الدفعات': 'Payment Requests',
  'إدارة الموردين': 'Supplier Management',
  'الموردون': 'Suppliers',
  'شخص التواصل': 'Contact Person',
  'الهاتف': 'Phone',
  'الإيميل': 'Email',
  '+ مورد': '+ Supplier',
  'الحماية': 'Security',
  'تفعيل كلمة المرور': 'Enable Password',
  'كلمة مرور جديدة': 'New Password',
  'اتركها فارغة إذا لم ترغب في تغييرها': 'Leave blank if you do not want to change it',
  'مدة القفل بالدقائق': 'Lock Duration (minutes)',
  'حفظ إعدادات المسؤول': 'Save Admin Settings',
  'تسجيل الخروج': 'Log Out',
  'إذا كانت كلمة المرور مفعّلة، فإن إدخالها بشكل خاطئ 3 مرات يؤدي إلى قفل الدخول حسب المدة المحددة. عند إيقافها يفتح البرنامج دون تسجيل دخول.': 'If password protection is enabled, three failed attempts lock access for the selected duration. When disabled, the system opens without login.',
  'تسجيل الدخول': 'Sign In',
  'أدخل كلمة المرور لفتح البرنامج.': 'Enter the password to open the system.',
  'كلمة المرور': 'Password',
  'بعد 3 محاولات خطأ يتم القفل حسب مدة إعدادات المسؤول.': 'After 3 failed attempts, access is locked based on the admin settings.',
  'تحديثات الإصدار': 'Release Notes',
  'الإصدار': 'Version',
  'سجل تحديثات الإصدارات': 'Version history',
  'بحث في الطلبات، أوامر الشراء، الموردين، المسؤولين...': 'Search requests, purchase orders, suppliers, owners...',
  'جاري تحميل بيانات الطلبات...': 'Loading request data...',
  'جاري حفظ البيانات...': 'Saving data...',
  'تعذر حفظ الطلب. حاول مرة أخرى.': 'Could not save the request. Please try again.',
  'تعذر حفظ التعديل. حاول مرة أخرى.': 'Could not save the update. Please try again.',
  'تعذر أرشفة الطلب. حاول مرة أخرى.': 'Could not archive the request. Please try again.',
  'تعذر مسح الطلب. حاول مرة أخرى.': 'Could not delete the request. Please try again.',
  'تعذر استرجاع الطلب. حاول مرة أخرى.': 'Could not restore the request. Please try again.',
  'تعذر الحذف النهائي. حاول مرة أخرى.': 'Could not permanently delete the request. Please try again.',
  'تعذر إضافة الدفعة. حاول مرة أخرى.': 'Could not add the payment. Please try again.',
  'تعذر تحديث الدفعة. حاول مرة أخرى.': 'Could not update the payment. Please try again.',
  'تعذر حذف الدفعة. حاول مرة أخرى.': 'Could not delete the payment. Please try again.',
  'تعذر حفظ الملاحظات. حاول مرة أخرى.': 'Could not save notes. Please try again.',
  'تعذر حفظ التغييرات. حاول مرة أخرى.': 'Could not save changes. Please try again.',
  'تعذر حفظ بيانات الطلب. حاول مرة أخرى.': 'Could not save request information. Please try again.',
  'تعذر حفظ عنوان الواجهة. حاول مرة أخرى.': 'Could not save the dashboard title. Please try again.',
  'تعذر إنشاء السنة المالية. حاول مرة أخرى.': 'Could not create the fiscal year. Please try again.',
  'تعذر حفظ ميزانية السنة. حاول مرة أخرى.': 'Could not save the annual budget. Please try again.',
  'تعذر إضافة بند الميزانية. تأكد أن الاسم غير مكرر.': 'Could not add the budget line. Make sure the name is not duplicated.',
  'تعذر حفظ بند الميزانية. حاول مرة أخرى.': 'Could not save the budget line. Please try again.',
  'تعذر مسح بند الميزانية. إذا كان مرتبطًا بطلبات، انقل الطلبات إلى بند آخر أولًا.': 'Could not delete the budget line. If linked to requests, move them to another line first.',
  'تعذر تغيير سنة الأرشيف. حاول مرة أخرى.': 'Could not change the archive year. Please try again.',
  'تعذر حفظ إعدادات المسؤول. حاول مرة أخرى.': 'Could not save admin settings. Please try again.',
  'تعذر التحقق من حالة الدخول.': 'Could not verify login status.',
  'تم قفل الدخول مؤقتًا بعد 3 محاولات خطأ.': 'Access was temporarily locked after 3 failed attempts.',
  'تعذر إضافة المورد. تأكد أن الاسم غير مكرر.': 'Could not add the supplier. Make sure the name is not duplicated.',
  'تعذر حفظ المورد. حاول مرة أخرى.': 'Could not save the supplier. Please try again.',
  'تعذر مسح الاقتراح. حاول مرة ثانية.': 'Could not remove the suggestion. Please try again.',
  'طلب جديد': 'New Request',
  'تم التواصل مع المورد': 'Supplier Contacted',
  'بانتظار عرض السعر': 'Awaiting Quotation',
  'تم استلام عرض السعر': 'Quotation Received',
  'قيد الاعتماد': 'Pending Approval',
  'تم إصدار LPO': 'LPO Issued',
  'قيد التوريد / التنفيذ': 'Supply / Execution in Progress',
  'تم الاستلام': 'Received',
  'مكتمل': 'Completed',
  'لم تستحق': 'Not Due',
  'قيد الانتظار': 'Pending',
  'مدفوعة': 'Paid',
  'متأخرة': 'Overdue',
  'عادي': 'Normal',
  'مهم': 'Important',
  'عاجل': 'Urgent',
  'ممتاز': 'Excellent',
  'جيد': 'Good',
  'بطيء': 'Slow',
  'يحتاج متابعة': 'Needs Follow-up',
  'إضافة فواصل آلاف في طلب جديد للقيمة الإجمالية ومبالغ الدفعات فقط': 'Added thousands separators in New Request for total value and payment amounts only',
  'إضافة فواصل آلاف أثناء كتابة وعرض مبالغ صفحة بنود الميزانية': 'Added thousands separators while entering and viewing Budget Lines amounts',
  'تحسين نافذة الإصدارات وإضافة تمرير داخلي لعرض الجديد والقديم': 'Improved the version panel with internal scrolling for new and old entries',
  'حفظ القيم الجديدة كمقترحات بعد إزالة الإخفاء': 'Saved new values as suggestions after clearing hidden suggestions',
  'إزالة قائمة المتصفح السوداء وترك الاقتراحات البيضاء فقط': 'Removed the native browser list and kept only the clean suggestion chips',
  'إضافة اقتراحات اسم الطلب': 'Added request-name suggestions',
  'إضافة زر مسح للاقتراحات الخاطئة': 'Added a delete button for incorrect suggestions',
  'إضافة اقتراحات ذكية للمورد والمسؤول ومقدم الطلب': 'Added smart suggestions for suppliers, owners, and requesters',
  'إضافة واجهة إنجليزية رسمية وزر تبديل اللغة': 'Added an official English interface and a language switcher',
  'إضافة سنوات وبنود الميزانية': 'Added budget years and budget lines',
  'إضافة كلمة مرور وإعدادات المسؤول': 'Added password protection and admin settings',
  'تم تنظيم الأرشيف حسب السنوات': 'Organized the archive by year',
  'إضافة ميزانية القسم والمتبقي': 'Added department budget and remaining balance',
  'ربط بطاقة الميزانية في لوحة التحكم بالسنة المختارة': 'Linked the dashboard budget card to the selected year',
  'تحسين شكل صفحة بنود الميزانية وتوضيح تعديل الميزانية وإضافة سنة جديدة': 'Improved the Budget Lines page and clarified budget editing and new-year creation',

  'الموردين': 'Suppliers',
  'دليل الموردين': 'Supplier Directory',
  'سجل مرتب للموردين وبيانات التواصل قبل ربطهم بخطوة إنشاء الطلب.': 'A structured supplier directory with contact details before linking suppliers to purchase requests.',
  'إجمالي الموردين': 'Total Suppliers',
  'مورد محفوظ': 'Saved suppliers',
  'طلبات مفتوحة': 'Open Requests',
  'حسب اسم المورد في الطلبات': 'Based on supplier name in requests',
  'موردين ممتازين': 'Excellent Suppliers',
  'حسب التقييم الحالي': 'Based on current rating',
  'لديهم إيميل': 'With Email',
  'جاهزين للمراسلة لاحقًا': 'Ready for later correspondence',
  'إضافة مورد جديد': 'Add New Supplier',
  'أدخل بيانات التواصل الأساسية، والملاحظات اختيارية.': 'Enter the main contact details; notes are optional.',
  'اسم المورد': 'Supplier Name',
  'جهة الاتصال': 'Contact Person',
  'رقم التواصل': 'Contact Number',
  'التقييم': 'Rating',
  'ملاحظات المورد': 'Supplier Notes',
  'شروط الدفع، ملاحظات التعامل، أو أي نقطة مهمة': 'Payment terms, handling notes, or any important point',
  'شروط دفع، جودة التعامل، سرعة التوريد...': 'Payment terms, service quality, delivery speed...',
  '+ إضافة مورد': '+ Add Supplier',
  'ما في موردين محفوظين حتى الآن.': 'No suppliers saved yet.',
  'عرض طلبات هذا المورد': 'View this supplier requests',
  'حفظ': 'Save',
  'تعديل البيانات': 'Edit Details',
  'حذف المورد': 'Delete Supplier',
  'حذف المورد؟': 'Delete supplier?',
  'لا يمكن مسح المورد إذا كنت تحتاج بياناته لاحقًا. الطلبات السابقة لن تُحذف.': 'Delete only the supplier record. Existing requests will not be deleted.',
  'تعذر حذف المورد. حاول مرة أخرى.': 'Could not delete the supplier. Please try again.',
  'تم حذف المورد.': 'Supplier deleted.',
  'تم حفظ إعدادات المسؤول بنجاح.': 'Admin settings saved successfully.',
  'إرسال إيميل عند إنشاء طلب جديد': 'Send email when a new request is created',
  'إيميل مستلم الطلبات الجديدة': 'New request recipient email',
  'يرسل البرنامج عبر Mail Relay الداخلي بدون يوزر أو باسورد.': 'The app sends through the internal Mail Relay without a username or password.',
  'ثيم الإيميل': 'Email Theme',
  'شكل رسالة Mail Relay': 'Mail Relay Message Style',
  'اختر ثيم واضح حسب عميل البريد والشبكة المعزولة.': 'Choose a clear theme for the email client and isolated network.',
  'اختبار إرسال بريد': 'Send Test Email',
  'يحفظ الإيميل الحالي ثم يرسل رسالة اختبار للمستلم.': 'Saves the current email settings, then sends a test message to the recipient.',
  'إذا كانت كلمة المرور مفعّلة، فإن إدخالها بشكل خاطئ 3 مرات يؤدي إلى قفل الدخول حسب المدة المحددة. تنبيهات الإيميل تستخدم Mail Relay الداخلي بعنوان مرسل مخفي من إعدادات السيرفر.': 'If password protection is enabled, three failed attempts lock sign-in for the configured duration. Email notifications use the internal Mail Relay with a sender address configured on the server.',
  'اكتب إيميل مستلم الطلبات الجديدة قبل اختبار الإرسال.': 'Enter the new request recipient email before sending a test.',
  'تم إرسال رسالة اختبار إلى': 'Test message sent to',
  'لم يتم إرسال رسالة الاختبار. تأكد من إعدادات البريد.': 'The test message was not sent. Check the email settings.',
  'فشل اختبار البريد. راجع Mail Relay والإيميل المكتوب.': 'Email test failed. Check the Mail Relay and recipient email.',
  'تعذر إرسال رسالة الاختبار. راجع إعدادات Mail Relay أو الإيميل.': 'Could not send the test email. Check the Mail Relay settings or recipient email.',
  'تم إنشاء الطلب، لكن تنبيه الإيميل لم يرسل. راجع Mail Relay.': 'Request created, but the email notification was not sent. Check the Mail Relay.',
  'تم إنشاء الطلب وإرسال تنبيه الإيميل.': 'Request created and email notification sent.',
  'ثيم البرنامج': 'App Theme',
  'أبيض واضح': 'Clear White',
  'أسود رسمي': 'Formal Black',
  'أزرق إداري': 'Administrative Blue',
  'أخضر هادئ': 'Calm Green',
  'كريمي وذهبي مثل واجهة SupplyDesk': 'Cream and gold like the SupplyDesk interface',
  'أعلى تباين للشبكات أو عملاء البريد الصارمين': 'Highest contrast for restrictive email clients or networks',
  'داكن احترافي للنصوص البيضاء الواضحة': 'Professional dark theme for clear white text',
  'رسمي وبارد للمراسلات الإدارية': 'Formal cool styling for administrative messages',
  'هادئ وواضح للمتابعة والاعتمادات': 'Calm and clear for follow-up and approvals',
  'استكمال ترجمة تفاصيل الطلب وطلب جديد وسجل الإصدار للإنجليزية': 'Completed English translations for request details, new request, and version panel',
  'تحسين محاذاة الهيدر وكروت لوحة التحكم في الإنجليزية': 'Improved English header and dashboard card alignment',
  'إصلاح الرجوع للغة العربية بعد التبديل من الإنجليزية': 'Fixed returning to Arabic after switching from English',
  'تحديث عنوان الواجهة وتحويل العملة إلى قائمة اختيار': 'Updated the hero title and changed currency settings to a dropdown',
  'إصلاح زر اللغة في شاشة الدخول وترجمة أمثلة الخانات للإنجليزية': 'Fixed the login language switcher and translated field examples in English mode',
  'تحسين شاشة تسجيل الدخول الإنجليزية واستكمال ترجمة الأرشيف': 'Improved the English login screen and completed Archive translations',
  'تحسين محاذاة الواجهة الإنجليزية لتبدأ كل العناصر من اليسار': 'Improved English layout alignment so all sections start from the left',
  'إضافة إعداد تغيير العملة واستكمال ترجمة شروحات الخانات للإنجليزية': 'Added currency settings and completed English translations for field descriptions',
  'يوجد كلمة مرور محفوظة حاليًا.': 'A password is currently saved.',
  'لا توجد كلمة مرور محفوظة؛ ضع كلمة قبل التفعيل.': 'No password is saved; set one before enabling protection.',
  'العملة': 'Currency',
  'رمز العملة': 'Currency Symbol',
  'كود العملة': 'Currency Code',
  'اختر العملة التي تظهر بجانب كل المبالغ في لوحة التحكم والطلبات وبنود الميزانية.': 'Choose the currency shown next to all amounts in the dashboard, requests, and budget lines.',
  'مثال: ر.ق أو QAR أو $ أو USD': 'Example: QAR, $, USD, KWD, or ر.ق',
  'مثال: QAR': 'Example: QAR',
  'مِثال: 1,000,000': 'Example: 1,000,000',
  'مِثال: 1,200,000': 'Example: 1,200,000',
  'مِثال: أجهزة ومعدات': 'Example: Equipment and supplies',
  'مِثال: 250,000': 'Example: 250,000',
  'سالم التجريبي\nليان التجريبية': 'John Smith\nSarah Johnson',
  'سالم التجريبي\nليان التجريبية\nماجد التجريبي': 'John Smith\nSarah Johnson\nMichael Brown',
  'أنشئ سنة مالية مستقلة، ثم وزع ميزانيتها على بنود مثل شراء الأدوات أو الصيانة واربط الطلبات بها.': 'Create an independent fiscal year, then distribute its budget across lines such as equipment purchases or maintenance and link requests to them.',
  'الأرشيف مرتب حسب سنة إنشاء الطلب، ويمكنك تغيير سنة أي طلب يدويًا عند الحاجة إلى نقله بين السنوات.': 'The archive is organized by request creation year. You can manually change any request year when it needs to move between years.',
  'تظهر هنا الطلبات المحذوفة فقط. يمكنك استرجاعها أو حذفها نهائيًا فورًا دون انتظار.': 'Only deleted requests appear here. You can restore them or permanently delete them immediately.',
  'افتح تفاصيل الطلب لتعديل الدفعات ومبالغها وحالتها.': 'Open request details to edit payments, amounts, and status.',
  'التعديل مباشر من الجدول، والمسؤولون يظهرون تحت بعض إذا كانوا أكثر من شخص.': 'Inline editing is available from the table, and multiple owners appear stacked for readability.',
  'إدارة الموردين محفوظة في قاعدة البيانات، بدون بطاقة جانبية تستهلك مساحة.': 'Supplier management is saved in the database without a side card taking extra space.',
  'يمكنك تغيير المظهر واستخدام البحث العام. سنضيف الإعدادات المتقدمة بعد اعتماد الصلاحيات.': 'You can change the theme and use global search. Advanced settings will be added after permissions are approved.',
  'يمكنك تفعيل كلمة المرور أو إيقافها، وتغييرها، وتحديد مدة القفل بعد 3 محاولات خاطئة.': 'Enable or disable password protection, change the password, set the lock duration after three failed attempts, and choose the display currency.',
  'ملخص مباشر:': 'Live summary:',
  'طلب نشط،': 'active request(s),',
  'مؤرشف،': 'archived,',
  'في المحذوفات.': 'deleted.',
}

const translatePhrase = (value, language = 'ar') => language === 'en' ? (englishUi[String(value)] || String(value)) : String(value)
const currentLanguage = () => document.documentElement.dataset.talabatiLanguage || 'en'
const t = (value) => translatePhrase(value, currentLanguage())
const currencySymbolFromSettings = (settings = {}) => String(settings.currencySymbol || settings.currencyCode || 'ر.ق').trim() || 'ر.ق'
const currencyOptions = [
  { code: 'QAR', symbol: 'ر.ق', labelAr: 'ريال قطري (ر.ق)', labelEn: 'Qatari Riyal (QAR)' },
  { code: 'USD', symbol: '$', labelAr: 'دولار أمريكي ($)', labelEn: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', labelAr: 'يورو (€)', labelEn: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', labelAr: 'جنيه إسترليني (£)', labelEn: 'British Pound (GBP)' },
  { code: 'SAR', symbol: 'ر.س', labelAr: 'ريال سعودي (ر.س)', labelEn: 'Saudi Riyal (SAR)' },
  { code: 'AED', symbol: 'د.إ', labelAr: 'درهم إماراتي (د.إ)', labelEn: 'UAE Dirham (AED)' },
  { code: 'KWD', symbol: 'د.ك', labelAr: 'دينار كويتي (د.ك)', labelEn: 'Kuwaiti Dinar (KWD)' },
  { code: 'BHD', symbol: 'د.ب', labelAr: 'دينار بحريني (د.ب)', labelEn: 'Bahraini Dinar (BHD)' },
  { code: 'OMR', symbol: 'ر.ع', labelAr: 'ريال عماني (ر.ع)', labelEn: 'Omani Rial (OMR)' },
]
const currencyFromCode = (code = 'QAR') => currencyOptions.find((currency) => currency.code === String(code || '').toUpperCase()) || currencyOptions[0]

function translateDom(root, language = 'ar') {
  if (!root || language !== 'en') return
  const shouldSkip = (node) => node.closest?.('[data-no-translate], input, textarea, script, style')
  const translateRaw = (text) => {
    if (!text || !/[\u0600-\u06ff]/.test(text)) return text
    const trimmed = text.trim()
    let next = englishUi[trimmed] || trimmed
    next = next.replace(/ر\.ق/g, 'QAR')
    next = next.replace(/^(مِثال|مثال):\s*/, 'Example: ')
    next = next.replace(/^الإصدار\s+/, 'Version ')
    next = next.replace(/^التسليم المتوقع:\s*/, 'Expected delivery: ')
    next = next.replace(/^دفعة\s+(\d+)/, 'Payment $1')
    next = next.replace(/^(\d+%)\s+مدفوع$/, '$1 paid')
    next = next.replace(/^(.*?)\s+طلب$/, '$1 request(s)')
    if (text.startsWith(' ') || text.endsWith(' ')) return text.replace(trimmed, next)
    return next
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !/[\u0600-\u06ff]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT
      if (shouldSkip(node.parentElement)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const textNodes = []
  while (walker.nextNode()) textNodes.push(walker.currentNode)
  textNodes.forEach((node) => { node.nodeValue = translateRaw(node.nodeValue) })
  root.querySelectorAll('[placeholder], [aria-label], [title]').forEach((element) => {
    for (const attr of ['placeholder', 'aria-label', 'title']) {
      const value = element.getAttribute(attr)
      if (value && /[\u0600-\u06ff]/.test(value)) element.setAttribute(attr, translateRaw(value))
    }
  })
}

function LanguageToggle({ language, setLanguage, reloadOnChange = false }) {
  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage)
    localStorage.setItem('talabati-language', nextLanguage)
    if (reloadOnChange && nextLanguage !== language) window.setTimeout(() => window.location.reload(), 0)
  }
  return (
    <div className="language-toggle" aria-label={language === 'en' ? 'Language switcher' : 'تغيير اللغة'}>
      <button className={language === 'ar' ? 'active' : ''} type="button" onClick={() => changeLanguage('ar')}>عربي</button>
      <button className={language === 'en' ? 'active' : ''} type="button" onClick={() => changeLanguage('en')}>English</button>
    </div>
  )
}
const changelog = [
  {
    version: '1.4.17',
    changes: ['Completed English translation for Budget Lines and the dashboard budget card'],
  },
  {
    version: '1.4.16',
    changes: ['Completed English translations for request details, new request, and version panel'],
  },
  {
    version: '1.4.15',
    changes: ['Improved English alignment for the topbar and dashboard KPI cards'],
  },
  {
    version: '1.4.14',
    changes: ['إصلاح الرجوع للغة العربية بعد التبديل من الإنجليزية'],
  },
  {
    version: '1.4.13',
    changes: ['تحديث عنوان الواجهة وتحويل العملة إلى قائمة اختيار'],
  },
  {
    version: '1.4.12',
    changes: ['إصلاح زر اللغة في شاشة الدخول وترجمة أمثلة الخانات للإنجليزية'],
  },
  {
    version: '1.4.11',
    changes: ['تحسين شاشة تسجيل الدخول الإنجليزية واستكمال ترجمة الأرشيف'],
  },
  {
    version: '1.4.10',
    changes: ['تحسين محاذاة الواجهة الإنجليزية لتبدأ كل العناصر من اليسار'],
  },
  {
    version: '1.4.9',
    changes: ['إضافة إعداد تغيير العملة واستكمال ترجمة شروحات الخانات للإنجليزية'],
  },
  {
    version: '1.4.8',
    changes: ['إضافة واجهة إنجليزية رسمية وزر تبديل اللغة'],
  },
  {
    version: '1.4.7',
    changes: ['إضافة فواصل آلاف في طلب جديد للقيمة الإجمالية ومبالغ الدفعات فقط'],
  },
  {
    version: '1.4.6',
    changes: ['إضافة فواصل آلاف أثناء كتابة وعرض مبالغ صفحة بنود الميزانية'],
  },
  {
    version: '1.4.5',
    changes: ['تحسين نافذة الإصدارات وإضافة تمرير داخلي لعرض الجديد والقديم'],
  },
  {
    version: '1.4.4',
    changes: ['حفظ القيم الجديدة كمقترحات بعد إزالة الإخفاء', 'إزالة قائمة المتصفح السوداء وترك الاقتراحات البيضاء فقط'],
  },
  {
    version: '1.4.3',
    changes: ['إضافة اقتراحات اسم الطلب', 'إضافة زر مسح للاقتراحات الخاطئة'],
  },
  {
    version: '1.4.2',
    changes: ['إضافة اقتراحات ذكية للمورد والمسؤول ومقدم الطلب'],
  },
  {
    version: '1.4.1',
    changes: ['ربط بطاقة الميزانية في لوحة التحكم بالسنة المختارة', 'تحسين شكل صفحة بنود الميزانية وتوضيح تعديل الميزانية وإضافة سنة جديدة'],
  },
  {
    version: '1.4',
    changes: ['إضافة سنوات وبنود الميزانية'],
  },
  {
    version: '1.3',
    changes: ['إضافة كلمة مرور وإعدادات المسؤول'],
  },
  {
    version: '1.2',
    changes: ['إضافة ميزانية القسم والمتبقي'],
  },
  {
    version: '1.1',
    changes: ['تم تنظيم الأرشيف حسب السنوات'],
  },
]

const makePaymentRows = (count, currentRows = []) => {
  const safeCount = Math.max(1, Math.min(12, Number(count) || 1))
  return Array.from({ length: safeCount }, (_, index) => currentRows[index] || {
    name: `دفعة ${index + 1}`,
    amount: '',
    status: index === 0 ? 'قيد الانتظار' : 'لم تستحق',
    dueDate: '',
  })
}

const emptyForm = {
  title: '',
  supplier: '',
  owner: '',
  lpo: '',
  requestNumber: '',
  requester: '',
  paymentNumber: '',
  budgetYear: '',
  budgetCategoryId: '',
  amount: '',
  paymentCount: 1,
  payments: makePaymentRows(1),
  priority: 'عادي',
  status: 'طلب جديد',
  expectedDate: '',
  notes: '',
}

const emptyPaymentForm = {
  name: '',
  percentage: '100',
  amount: '',
  status: 'لم تستحق',
  dueDate: '',
}

const emptySupplierForm = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  rating: 'جيد',
  notes: '',
}

const emptyBudgetCategoryForm = {
  name: '',
  allocatedAmount: '',
  notes: '',
}

const emptyBudgetYearForm = {
  year: String(new Date().getFullYear() + 1),
  budget: '',
  notes: '',
}

function yearFromDate(value) {
  const match = String(value || '').match(/^(\d{4})/)
  return match ? match[1] : String(new Date().getFullYear())
}

function archiveYearForOrder(order) {
  return order.archiveYear || yearFromDate(order.createdAt)
}

function archiveYearOptions(orders = []) {
  const currentYear = new Date().getFullYear()
  const years = new Set([String(currentYear), String(currentYear - 1), String(currentYear + 1)])
  for (const order of orders) years.add(archiveYearForOrder(order))
  return [...years].filter(Boolean).sort((a, b) => Number(b) - Number(a))
}

function parseMoneyInput(value) {
  const normalized = String(value ?? '').replace(/,/g, '').replace(/[^0-9.-]/g, '')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : 0
}

function formatMoneyInput(value) {
  const raw = String(value ?? '').replace(/,/g, '').replace(/[^0-9.]/g, '')
  if (!raw) return ''
  const [integerPart, ...decimalParts] = raw.split('.')
  const integer = integerPart.replace(/^0+(?=\d)/, '')
  const formattedInteger = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(integer || 0))
  if (raw.includes('.')) return `${formattedInteger}.${decimalParts.join('').slice(0, 2)}`
  return formattedInteger
}

function currentYearText() {
  return String(new Date().getFullYear())
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="theme-toggle" aria-label="تغيير المظهر">
      <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')} type="button">
        <Sun size={16} />
        فاتح كريمي
      </button>
      <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')} type="button">
        <Moon size={16} />
        داكن رمادي
      </button>
    </div>
  )
}

function Sidebar({ activeSection, setActiveSection }) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">S</div>
        <div>
          <strong>SupplyDesk</strong>
          <span>نظام المشتريات</span>
        </div>
      </div>

      <nav className="main-nav" aria-label="القائمة الرئيسية">
        {navItems.map(({ label, icon: Icon }) => (
          <button className={activeSection === label ? 'active' : ''} onClick={() => setActiveSection(label)} type="button" key={label}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

function MetricCard({ icon: Icon, label, value, hint, tone = 'brand' }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-header">
        <span className="metric-icon"><Icon size={19} /></span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  )
}

function OwnersEditor({ owners, onDraft, onSave }) {
  const value = (owners || []).join('\n')
  return (
    <textarea
      className="table-input owners-input"
      value={value}
      rows={Math.max(2, owners?.length || 1)}
      onChange={(event) => onDraft({ owner: event.target.value })}
      onBlur={(event) => onSave({ owner: event.target.value })}
      aria-label="المسؤولون"
    />
  )
}

function OrderRow({ order, mode = 'active', archiveYears = [], onOpenDetails, onArchive, onTrash, onRestore, onDeleteForever, onArchiveYearChange, formatMoney = formatCurrency }) {
  const summary = paymentSummary(order.payments)
  return (
    <tr>
      <td>
        <div className="order-title-cell">
          <span className="request-id">{order.id}</span>
          <strong>{order.title}</strong>
          <small>التسليم المتوقع: {order.expectedDate || 'غير محدد'}</small>
        </div>
      </td>
      <td>{order.supplier}</td>
      <td><div className="owner-stack">{(order.owners || []).map((owner) => <span key={owner}>{owner}</span>)}</div></td>
      <td>{order.lpo || 'بانتظار LPO'}</td>
      <td>{order.requestNumber || '—'}</td>
      <td>{order.status}</td>
      <td>
        <div className="progress-cell">
          <strong>{formatMoney(order.amount || 0)}</strong>
          <div className="progress-text"><span>{summary.paidPercentage}%</span><b>{formatMoney(summary.remaining)}</b></div>
          <div className="progress-track"><span style={{ width: `${summary.paidPercentage}%` }} /></div>
        </div>
      </td>
      <td>
        <div className="row-actions-stack">
          <button className="row-action" type="button" data-details-id={order.id} onMouseDown={() => onOpenDetails?.(order.id)} onClick={() => onOpenDetails?.(order.id)}>تفاصيل</button>
          {mode === 'active' && <button className="row-action archive" type="button" onClick={() => onArchive(order.id)}>أرشفة</button>}
          {mode === 'active' && <button className="row-action danger" type="button" onClick={() => onTrash(order.id)}>مسح</button>}
          {mode === 'archive' && (
            <label className="archive-year-select">
              <span>سنة الأرشيف</span>
              <select value={archiveYearForOrder(order)} onChange={(event) => onArchiveYearChange?.(order.id, event.target.value)}>
                {archiveYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          )}
          {mode !== 'active' && <button className="row-action" type="button" onClick={() => onRestore(order.id)}>استرجاع</button>}
          {mode === 'trash' && <button className="row-action danger" type="button" onClick={() => onDeleteForever(order.id)}>حذف نهائي</button>}
        </div>
      </td>
    </tr>
  )
}

function SupplierCard({ supplier, onFocusOrders, onUpdate, onDelete, disabled }) {
  const isEnglish = currentLanguage() === 'en'
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(() => ({
    name: supplier.name || '',
    contact: supplier.contact || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    rating: supplier.rating || 'جيد',
    notes: supplier.notes || '',
  }))

  useEffect(() => {
    if (isEditing) return
    setDraft({
      name: supplier.name || '',
      contact: supplier.contact || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      rating: supplier.rating || 'جيد',
      notes: supplier.notes || '',
    })
  }, [supplier, isEditing])

  const cancelEdit = () => {
    setDraft({
      name: supplier.name || '',
      contact: supplier.contact || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      rating: supplier.rating || 'جيد',
      notes: supplier.notes || '',
    })
    setIsEditing(false)
  }

  const saveEdit = async () => {
    const cleanDraft = { ...draft, name: draft.name.trim() || supplier.name }
    try {
      await onUpdate(supplier.id, cleanDraft)
      setIsEditing(false)
    } catch {
      // The parent shows the save error banner; keep edit mode open so the user can fix the data.
    }
  }

  return (
    <article className="supplier-card supplier-editor">
      <button className="supplier-avatar" type="button" onClick={() => onFocusOrders(supplier)} title={isEnglish ? 'View this supplier requests' : 'عرض طلبات هذا المورد'}>{supplier.name.slice(0, 1)}</button>
      <div className="supplier-main">
        {isEditing ? (
          <div className="supplier-fields">
            <label className="supplier-name-field">{isEnglish ? 'Supplier Name' : 'اسم المورد'}<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} aria-label={isEnglish ? 'Supplier Name' : 'اسم المورد'} /></label>
            <label>{isEnglish ? 'Contact Person' : 'جهة الاتصال'}<input value={draft.contact} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} aria-label={isEnglish ? 'Contact Person' : 'جهة الاتصال'} placeholder={isEnglish ? 'Contact person or department' : 'اسم المسؤول أو القسم'} /></label>
            <label>{isEnglish ? 'Contact Number' : 'رقم التواصل'}<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="+974 ...." /></label>
            <label>{isEnglish ? 'Email' : 'الإيميل'}<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="supplier@company.com" /></label>
            <label className="supplier-notes-field">{isEnglish ? 'Supplier Notes' : 'ملاحظات المورد'}<textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder={isEnglish ? 'Payment terms, handling notes, or any important point' : 'شروط الدفع، ملاحظات التعامل، أو أي نقطة مهمة'} /></label>
          </div>
        ) : (
          <div className="supplier-readonly">
            <strong>{supplier.name}</strong>
            <div><span>{isEnglish ? 'Contact Person' : 'جهة الاتصال'}</span><b>{supplier.contact || (isEnglish ? 'Not specified' : 'غير محدد')}</b></div>
            <div><span>{isEnglish ? 'Contact Number' : 'رقم التواصل'}</span><b>{supplier.phone || (isEnglish ? 'Not specified' : 'غير محدد')}</b></div>
            <div><span>{isEnglish ? 'Email' : 'الإيميل'}</span><b>{supplier.email || (isEnglish ? 'Not specified' : 'غير محدد')}</b></div>
            {supplier.notes && <p>{supplier.notes}</p>}
          </div>
        )}
      </div>
      <div className="supplier-meta">
        <span>{isEnglish ? 'Rating' : 'التقييم'}</span>
        {isEditing ? (
          <select value={draft.rating} onChange={(event) => setDraft({ ...draft, rating: event.target.value })}>
            <option>ممتاز</option><option>جيد</option><option>بطيء</option><option>يحتاج متابعة</option>
          </select>
        ) : <strong className="supplier-rating-view">{supplier.rating}</strong>}
        <button className="supplier-orders-pill" type="button" onClick={() => onFocusOrders(supplier)}><b>{supplier.openOrders}</b><small>{isEnglish ? 'Open Requests' : 'طلبات مفتوحة'}</small></button>
        {isEditing ? (
          <div className="supplier-edit-actions">
            <button className="primary-action" type="button" onClick={saveEdit} disabled={disabled}>{isEnglish ? 'Save' : 'حفظ'}</button>
            <button className="ghost-action" type="button" onClick={cancelEdit} disabled={disabled}>{isEnglish ? 'Cancel' : 'إلغاء'}</button>
          </div>
        ) : (
          <div className="supplier-edit-actions">
            <button className="ghost-action" type="button" onClick={() => setIsEditing(true)} disabled={disabled}>{isEnglish ? 'Edit Details' : 'تعديل البيانات'}</button>
            <button className="danger-action" type="button" onClick={() => onDelete(supplier)} disabled={disabled}>{isEnglish ? 'Delete Supplier' : 'حذف المورد'}</button>
          </div>
        )}
      </div>
    </article>
  )
}

function SuppliersPanel({ suppliers, supplierForm, setSupplierForm, onCreateSupplier, onUpdateSupplier, onDeleteSupplier, onFocusOrders, disabled }) {
  const isEnglish = currentLanguage() === 'en'
  const openOrders = suppliers.reduce((total, supplier) => total + Number(supplier.openOrders || 0), 0)
  const suppliersWithEmail = suppliers.filter((supplier) => String(supplier.email || '').trim()).length
  const excellentSuppliers = suppliers.filter((supplier) => supplier.rating === 'ممتاز').length
  return (
    <article className="panel suppliers-panel full-panel">
      <div className="panel-header supplier-page-header">
        <div>
          <span>{isEnglish ? 'Supplier Directory' : 'دليل الموردين'}</span>
          <h2>{isEnglish ? `Suppliers (${suppliers.length})` : `الموردين (${suppliers.length})`}</h2>
        </div>
        <p>{isEnglish ? 'A structured supplier directory with contact details before linking suppliers to purchase requests.' : 'سجل مرتب للموردين وبيانات التواصل قبل ربطهم بخطوة إنشاء الطلب.'}</p>
      </div>
      <div className="supplier-summary-grid">
        <MetricCard icon={Building2} label={isEnglish ? 'Total Suppliers' : 'إجمالي الموردين'} value={suppliers.length} hint={isEnglish ? 'Saved suppliers' : 'مورد محفوظ'} />
        <MetricCard icon={FileText} label={isEnglish ? 'Open Requests' : 'طلبات مفتوحة'} value={openOrders} hint={isEnglish ? 'Based on supplier name in requests' : 'حسب اسم المورد في الطلبات'} tone="warning" />
        <MetricCard icon={CreditCard} label={isEnglish ? 'Excellent Suppliers' : 'موردين ممتازين'} value={excellentSuppliers} hint={isEnglish ? 'Based on current rating' : 'حسب التقييم الحالي'} tone="success" />
        <MetricCard icon={Clock3} label={isEnglish ? 'With Email' : 'لديهم إيميل'} value={suppliersWithEmail} hint={isEnglish ? 'Ready for later correspondence' : 'جاهزين للمراسلة لاحقًا'} tone="info" />
      </div>
      <form className="supplier-create-form" onSubmit={onCreateSupplier}>
        <div className="supplier-form-title">
          <strong>{isEnglish ? 'Add New Supplier' : 'إضافة مورد جديد'}</strong>
          <span>{isEnglish ? 'Enter the main contact details; notes are optional.' : 'أدخل بيانات التواصل الأساسية، والملاحظات اختيارية.'}</span>
        </div>
        <label>{isEnglish ? 'Supplier Name' : 'اسم المورد'}<input placeholder={isEnglish ? 'Example: Qatar Facilities' : 'مثال: Qatar Facilities'} required value={supplierForm.name} onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} /></label>
        <label>{isEnglish ? 'Contact Person' : 'جهة الاتصال'}<input placeholder={isEnglish ? 'Contact person or department' : 'اسم المسؤول أو القسم'} value={supplierForm.contact} onChange={(event) => setSupplierForm({ ...supplierForm, contact: event.target.value })} /></label>
        <label>{isEnglish ? 'Contact Number' : 'رقم التواصل'}<input placeholder="+974 ...." value={supplierForm.phone} onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })} /></label>
        <label>{isEnglish ? 'Email' : 'الإيميل'}<input type="email" placeholder="supplier@company.com" value={supplierForm.email} onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })} /></label>
        <label>{isEnglish ? 'Rating' : 'التقييم'}<select value={supplierForm.rating} onChange={(event) => setSupplierForm({ ...supplierForm, rating: event.target.value })}><option>ممتاز</option><option>جيد</option><option>بطيء</option><option>يحتاج متابعة</option></select></label>
        <label className="wide">{isEnglish ? 'Notes' : 'ملاحظات'}<textarea placeholder={isEnglish ? 'Payment terms, service quality, delivery speed...' : 'شروط دفع، جودة التعامل، سرعة التوريد...'} value={supplierForm.notes} onChange={(event) => setSupplierForm({ ...supplierForm, notes: event.target.value })} /></label>
        <button className="primary-action" type="submit" disabled={disabled}>{isEnglish ? '+ Add Supplier' : '+ إضافة مورد'}</button>
      </form>
      <div className="supplier-list full-list">
        {suppliers.map((supplier) => <SupplierCard key={supplier.id || supplier.name} supplier={supplier} onFocusOrders={onFocusOrders} onUpdate={onUpdateSupplier} onDelete={onDeleteSupplier} disabled={disabled} />)}
      </div>
      {suppliers.length === 0 && <div className="empty-state">{isEnglish ? 'No suppliers saved yet.' : 'ما في موردين محفوظين حتى الآن.'}</div>}
    </article>
  )
}

const suggestionGroups = ['title', 'supplier', 'owner', 'requester']
const emptyHiddenSuggestions = Object.fromEntries(suggestionGroups.map((group) => [group, []]))
const normalizeSuggestionText = (value = '') => String(value || '').trim()
const uniqueSuggestions = (values = []) => Array.from(new Set(values.map(normalizeSuggestionText).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'))
const matchingSuggestions = (suggestions = [], term = '') => {
  const normalizedTerm = normalizeSuggestionText(term).toLowerCase()
  if (!normalizedTerm) return []
  return suggestions.filter((item) => item.toLowerCase().startsWith(normalizedTerm) && item.toLowerCase() !== normalizedTerm).slice(0, 6)
}
const parseHiddenSuggestions = (value = '{}') => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '{}') : value
    return Object.fromEntries(suggestionGroups.map((group) => [group, uniqueSuggestions(parsed?.[group] || [])]))
  } catch {
    return emptyHiddenSuggestions
  }
}
const filterHiddenSuggestions = (suggestions = [], hidden = []) => {
  const hiddenSet = new Set((hidden || []).map((item) => normalizeSuggestionText(item).toLowerCase()))
  return suggestions.filter((item) => !hiddenSet.has(normalizeSuggestionText(item).toLowerCase()))
}
const orderSuggestionValues = (order = {}) => ({
  title: [order.title],
  supplier: [order.supplier],
  owner: order.owners || String(order.owner || '').split('\n'),
  requester: [order.requester],
})
const removeValuesFromHiddenSuggestions = (hidden = emptyHiddenSuggestions, valuesByGroup = {}) => Object.fromEntries(suggestionGroups.map((group) => {
  const savedSet = new Set((valuesByGroup[group] || []).map((item) => normalizeSuggestionText(item).toLowerCase()).filter(Boolean))
  return [group, uniqueSuggestions((hidden[group] || []).filter((item) => !savedSet.has(normalizeSuggestionText(item).toLowerCase())))]
}))
const hiddenSuggestionsEqual = (first = emptyHiddenSuggestions, second = emptyHiddenSuggestions) => suggestionGroups.every((group) => JSON.stringify(uniqueSuggestions(first[group] || [])) === JSON.stringify(uniqueSuggestions(second[group] || [])))

function SuggestionPills({ suggestions = [], term = '', onChoose, onDelete, ariaLabel = 'اقتراحات' }) {
  const matches = matchingSuggestions(suggestions, term)
  if (!matches.length) return null
  return (
    <div className="suggestion-pills" aria-label={ariaLabel}>
      {matches.map((item) => (
        <span className="suggestion-chip" key={item}>
          <button className="suggestion-pick" type="button" onMouseDown={(event) => { event.preventDefault(); onChoose(item) }}>{item}</button>
          {onDelete && <button className="suggestion-delete" type="button" title={`مسح اقتراح ${item}`} aria-label={`مسح اقتراح ${item}`} onMouseDown={(event) => { event.preventDefault(); onDelete(item) }}>×</button>}
        </span>
      ))}
    </div>
  )
}

function AutocompleteInput({ id, label, value, onChange, suggestions = [], required = false, inputMode, placeholder = '', onDeleteSuggestion }) {
  return (
    <label className="autocomplete-field">{label}<input required={required} inputMode={inputMode} value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      <SuggestionPills suggestions={suggestions} term={value} onChoose={onChange} onDelete={onDeleteSuggestion} ariaLabel={`اقتراحات ${label}`} />
    </label>
  )
}

function OwnersAutocompleteTextarea({ value, onChange, suggestions = [], placeholder = '', onDeleteSuggestion }) {
  const lines = String(value || '').split('\n')
  const currentLine = lines.at(-1) || ''
  const chooseSuggestion = (name) => {
    const nextLines = String(value || '').split('\n')
    nextLines[nextLines.length - 1] = name
    onChange(nextLines.join('\n'))
  }
  return (
    <label className="wide autocomplete-field">المسؤولون<textarea value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <SuggestionPills suggestions={suggestions} term={currentLine} onChoose={chooseSuggestion} onDelete={onDeleteSuggestion} ariaLabel="اقتراحات المسؤولين" />
    </label>
  )
}

function OrderDetailsPanel({ order, formatMoney = formatCurrency, detailDraft, setDetailDraft, paymentForm, setPaymentForm, noteDraft, setNoteDraft, budgetYears = [], budgetCategories = [], titleSuggestions = [], supplierSuggestions = [], ownerSuggestions = [], requesterSuggestions = [], onDeleteSuggestion, onClose, onAddPayment, onUpdatePayment, onDeletePayment, onSaveOrderChanges }) {
  if (!order) return null
  const summary = paymentSummary(order.payments)
  return (
    <div className="details-backdrop" role="dialog" aria-modal="true" aria-label="تفاصيل الطلب">
      <aside className="details-panel">
        <div className="details-header">
          <div>
            <span className="eyebrow">{order.id}</span>
            <h2>{order.title}</h2>
            <p>{order.supplier}</p>
          </div>
          <button className="ghost-action" type="button" onClick={onClose}>إغلاق</button>
        </div>

        <section className="details-section">
          <div className="details-section-title"><h3>بيانات الطلب</h3><span>عدّل براحتك ثم احفظ</span></div>
          <div className="detail-edit-grid">
            <AutocompleteInput id="detail-title-suggestions" label="اسم الطلب" value={detailDraft.title || ''} suggestions={titleSuggestions} onChange={(value) => setDetailDraft({ ...detailDraft, title: value })} onDeleteSuggestion={(value) => onDeleteSuggestion('title', value)} />
            <AutocompleteInput id="detail-supplier-suggestions" label="المورد" value={detailDraft.supplier || ''} suggestions={supplierSuggestions} onChange={(value) => setDetailDraft({ ...detailDraft, supplier: value })} onDeleteSuggestion={(value) => onDeleteSuggestion('supplier', value)} />
            <OwnersAutocompleteTextarea value={detailDraft.owner || ''} suggestions={ownerSuggestions} onChange={(value) => setDetailDraft({ ...detailDraft, owner: value })} onDeleteSuggestion={(value) => onDeleteSuggestion('owner', value)} placeholder={'سالم التجريبي\nليان التجريبية'} />
            <label>رقم LPO<input value={detailDraft.lpo || ''} onChange={(event) => setDetailDraft({ ...detailDraft, lpo: event.target.value })} /></label>
            <label>رقم الطلب<input value={detailDraft.requestNumber || ''} onChange={(event) => setDetailDraft({ ...detailDraft, requestNumber: event.target.value })} /></label>
            <AutocompleteInput id="detail-requester-suggestions" label="مقدم الطلب" value={detailDraft.requester || ''} suggestions={requesterSuggestions} onChange={(value) => setDetailDraft({ ...detailDraft, requester: value })} onDeleteSuggestion={(value) => onDeleteSuggestion('requester', value)} />
            <label>رقم الدفعة<input value={detailDraft.paymentNumber || ''} onChange={(event) => setDetailDraft({ ...detailDraft, paymentNumber: event.target.value })} /></label>
            <label>سنة الميزانية<select value={detailDraft.budgetYear || currentYearText()} onChange={(event) => setDetailDraft({ ...detailDraft, budgetYear: event.target.value, budgetCategoryId: '' })}>{budgetYears.map((year) => <option key={year.year} value={year.year}>{year.year}</option>)}</select></label>
            <label>بند الميزانية<select value={detailDraft.budgetCategoryId || ''} onChange={(event) => setDetailDraft({ ...detailDraft, budgetCategoryId: event.target.value })}><option value="">بدون بند</option>{budgetCategories.filter((category) => String(category.year) === String(detailDraft.budgetYear || currentYearText())).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>القيمة الإجمالية<input inputMode="decimal" value={formatMoneyInput(detailDraft.amount || '')} onChange={(event) => setDetailDraft({ ...detailDraft, amount: formatMoneyInput(event.target.value) })} /></label>
            <label>الحالة<select value={detailDraft.status || 'طلب جديد'} onChange={(event) => setDetailDraft({ ...detailDraft, status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{t(status)}</option>)}</select></label>
            <label>الأولوية<select value={detailDraft.priority || 'عادي'} onChange={(event) => setDetailDraft({ ...detailDraft, priority: event.target.value })}><option value="عادي">{t('عادي')}</option><option value="مهم">{t('مهم')}</option><option value="عاجل">{t('عاجل')}</option></select></label>
            <label>تاريخ التسليم المتوقع<input type="date" value={detailDraft.expectedDate || ''} onChange={(event) => setDetailDraft({ ...detailDraft, expectedDate: event.target.value })} /></label>
          </div>
        </section>

        <section className="details-summary-grid">
          <div><span>الحالة</span><strong>{order.status}</strong></div>
          <div><span>الأولوية</span><strong>{order.priority}</strong></div>
          <div><span>رقم LPO</span><strong>{order.lpo || 'بانتظار LPO'}</strong></div>
          <div><span>رقم الطلب</span><strong>{order.requestNumber || 'غير محدد'}</strong></div>
          <div><span>مقدم الطلب</span><strong>{order.requester || 'غير محدد'}</strong></div>
          <div><span>رقم الدفعة</span><strong>{order.paymentNumber || 'غير محدد'}</strong></div>
          <div><span>سنة الميزانية</span><strong>{order.budgetYear || currentYearText()}</strong></div>
          <div><span>بند الميزانية</span><strong>{budgetCategories.find((category) => category.id === order.budgetCategoryId)?.name || 'غير محدد'}</strong></div>
          <div><span>المتبقي</span><strong>{formatMoney(summary.remaining)}</strong></div>
        </section>

        <section className="details-section">
          <div className="details-section-title"><h3>الدفعات</h3><span>{currentLanguage() === 'en' ? `${summary.paidPercentage}% paid` : `${summary.paidPercentage}% مدفوع`}</span></div>
          <div className="payments-list">
            {(order.payments || []).map((payment) => (
              <article className="payment-card" key={payment.id || payment.name}>
                <input value={payment.name} onChange={(event) => onUpdatePayment(order.id, payment.id, { name: event.target.value })} />
                <input inputMode="decimal" value={formatMoneyInput(payment.amount)} onChange={(event) => onUpdatePayment(order.id, payment.id, { amount: formatMoneyInput(event.target.value) })} />
                <select value={payment.status} onChange={(event) => onUpdatePayment(order.id, payment.id, { status: event.target.value })}>
                  {paymentStatuses.map((status) => <option key={status} value={status}>{t(status)}</option>)}
                </select>
                <input type="date" value={payment.dueDate || ''} onChange={(event) => onUpdatePayment(order.id, payment.id, { dueDate: event.target.value })} />
                <button className="row-action danger" type="button" onClick={() => onDeletePayment(order.id, payment.id)}>حذف</button>
              </article>
            ))}
          </div>
          <form className="payment-form" onSubmit={(event) => { event.preventDefault(); onAddPayment(order.id) }}>
            <input placeholder="اسم الدفعة" value={paymentForm.name} onChange={(event) => setPaymentForm({ ...paymentForm, name: event.target.value })} />
            <input placeholder="المبلغ" inputMode="decimal" value={formatMoneyInput(paymentForm.amount)} onChange={(event) => setPaymentForm({ ...paymentForm, amount: formatMoneyInput(event.target.value) })} />
            <select value={paymentForm.status} onChange={(event) => setPaymentForm({ ...paymentForm, status: event.target.value })}>
              {paymentStatuses.map((status) => <option key={status} value={status}>{t(status)}</option>)}
            </select>
            <input type="date" value={paymentForm.dueDate} onChange={(event) => setPaymentForm({ ...paymentForm, dueDate: event.target.value })} />
            <button className="primary-action" type="submit">+ إضافة دفعة</button>
          </form>
        </section>

        <section className="details-section">
          <div className="details-section-title"><h3>ملاحظات</h3><span>ملاحظاتك اليدوية فقط</span></div>
          <textarea className="notes-editor" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="اكتب ملاحظاتك هنا..." />
          <button className="primary-action notes-save" type="button" onClick={() => onSaveOrderChanges(order.id)}>حفظ التغييرات</button>
        </section>
      </aside>
    </div>
  )
}

function PaymentRowsEditor({ form, setForm }) {
  const setCount = (nextCount) => setForm({ ...form, paymentCount: nextCount, payments: makePaymentRows(nextCount, form.payments) })
  const updatePayment = (index, patch) => {
    const nextPayments = makePaymentRows(form.paymentCount, form.payments).map((payment, paymentIndex) => paymentIndex === index ? { ...payment, ...patch } : payment)
    setForm({ ...form, payments: nextPayments })
  }
  return (
    <div className="payment-rows-box wide">
      <div className="payment-count-row">
        <span>عدد الدفعات</span>
        <div>
          <button type="button" onClick={() => setCount(Number(form.paymentCount || 1) - 1)}>-</button>
          <input value={form.paymentCount} inputMode="numeric" onChange={(event) => setCount(event.target.value)} />
          <button type="button" onClick={() => setCount(Number(form.paymentCount || 1) + 1)}>+</button>
        </div>
      </div>
      <div className="payment-create-grid">
        {makePaymentRows(form.paymentCount, form.payments).map((payment, index) => (
          <article className="payment-create-row" key={index}>
            <strong>دفعة {index + 1}</strong>
            <input placeholder="المبلغ" inputMode="decimal" value={formatMoneyInput(payment.amount)} onChange={(event) => updatePayment(index, { amount: formatMoneyInput(event.target.value) })} />
            <select value={payment.status} onChange={(event) => updatePayment(index, { status: event.target.value })}>
              {paymentStatuses.map((status) => <option key={status} value={status}>{t(status)}</option>)}
            </select>
          </article>
        ))}
      </div>
    </div>
  )
}

function OrderFormModal({ mode, form, setForm, budgetYears = [], budgetCategories = [], titleSuggestions = [], supplierSuggestions = [], ownerSuggestions = [], requesterSuggestions = [], onDeleteSuggestion, onClose, onSubmit }) {
  const title = mode === 'edit' ? 'تعديل الطلب' : 'طلب جديد'
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <form className="order-modal" onSubmit={onSubmit}>
        <div className="modal-header">
          <div><span>إدارة الطلبات</span><h2>{title}</h2></div>
          <button className="ghost-action" type="button" onClick={onClose}>إغلاق</button>
        </div>

        <div className="form-grid">
          <AutocompleteInput id="order-title-suggestions" label="اسم الطلب" required value={form.title} suggestions={titleSuggestions} onChange={(value) => setForm({ ...form, title: value })} onDeleteSuggestion={(value) => onDeleteSuggestion('title', value)} />
          <AutocompleteInput id="order-supplier-suggestions" label="المورد" required value={form.supplier} suggestions={supplierSuggestions} onChange={(value) => setForm({ ...form, supplier: value })} onDeleteSuggestion={(value) => onDeleteSuggestion('supplier', value)} />
          <OwnersAutocompleteTextarea value={form.owner} suggestions={ownerSuggestions} onChange={(value) => setForm({ ...form, owner: value })} onDeleteSuggestion={(value) => onDeleteSuggestion('owner', value)} placeholder={'سالم التجريبي\nليان التجريبية\nماجد التجريبي'} />
          <label>رقم LPO<input value={form.lpo} onChange={(e) => setForm({ ...form, lpo: e.target.value })} /></label>
          <label>رقم الطلب<input value={form.requestNumber} onChange={(e) => setForm({ ...form, requestNumber: e.target.value })} /></label>
          <AutocompleteInput id="order-requester-suggestions" label="مقدم الطلب" value={form.requester} suggestions={requesterSuggestions} onChange={(value) => setForm({ ...form, requester: value })} onDeleteSuggestion={(value) => onDeleteSuggestion('requester', value)} />
          <label>رقم الدفعة<input value={form.paymentNumber} onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })} /></label>
          <label>سنة الميزانية<select value={form.budgetYear || currentYearText()} onChange={(e) => setForm({ ...form, budgetYear: e.target.value, budgetCategoryId: '' })}>{budgetYears.map((year) => <option key={year.year} value={year.year}>{year.year}</option>)}</select></label>
          <label>بند الميزانية<select value={form.budgetCategoryId || ''} onChange={(e) => setForm({ ...form, budgetCategoryId: e.target.value })}><option value="">بدون بند</option>{budgetCategories.filter((category) => String(category.year) === String(form.budgetYear || currentYearText())).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>القيمة الإجمالية<input required inputMode="decimal" value={mode === 'edit' ? form.amount : formatMoneyInput(form.amount)} onChange={(e) => setForm({ ...form, amount: mode === 'edit' ? e.target.value : formatMoneyInput(e.target.value) })} /></label>
          {mode !== 'edit' && <PaymentRowsEditor form={form} setForm={setForm} />}
          <label>الحالة<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statuses.map((status) => <option key={status} value={status}>{t(status)}</option>)}</select></label>
          <label>الأولوية<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="عادي">{t('عادي')}</option><option value="مهم">{t('مهم')}</option><option value="عاجل">{t('عاجل')}</option></select></label>
          <label>تاريخ التسليم المتوقع<input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} /></label>
          <label className="wide">ملاحظة<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        </div>

        <div className="modal-footer">
          <button className="ghost-action" type="button" onClick={onClose}>{isEnglish ? 'Cancel' : 'إلغاء'}</button>
          <button className="primary-action" type="submit">حفظ الطلب</button>
        </div>
      </form>
    </div>
  )
}


function BudgetCategoriesPanel({ years, categories, formatMoney = formatCurrency, selectedYear, setSelectedYear, yearDraft, setYearDraft, categoryForm, setCategoryForm, onCreateYear, onUpdateYear, onCreateCategory, onUpdateCategory, onDeleteCategory, disabled }) {
  const [categoryNameDrafts, setCategoryNameDrafts] = useState({})
  const currentYear = years.find((year) => String(year.year) === String(selectedYear)) || years[0] || { year: currentYearText(), budget: 0, allocated: 0, unallocated: 0, consumed: 0, remaining: 0 }
  const isEnglish = currentLanguage() === 'en'
  const yearCategories = categories.filter((category) => String(category.year) === String(currentYear.year))
  const categoryNameValue = (category) => Object.prototype.hasOwnProperty.call(categoryNameDrafts, category.id) ? categoryNameDrafts[category.id] : category.name
  const updateCategoryNameDraft = (categoryId, value) => setCategoryNameDrafts((current) => ({ ...current, [categoryId]: value }))
  const clearCategoryNameDraft = (categoryId) => setCategoryNameDrafts((current) => {
    const next = { ...current }
    delete next[categoryId]
    return next
  })
  const commitCategoryName = (category, value = categoryNameDrafts[category.id]) => {
    const nextName = String(value || '').trim() ? value : category.name
    clearCategoryNameDraft(category.id)
    if (nextName !== category.name) onUpdateCategory(category.id, { name: nextName })
  }
  return (
    <article className="panel budget-panel full-panel">
      <div className="panel-header budget-page-header">
        <div>
          <span>{isEnglish ? 'Annual Budget Management' : 'إدارة الميزانية السنوية'}</span>
          <h2>{isEnglish ? `Budget Lines for ${currentYear.year}` : `بنود الميزانية لسنة ${currentYear.year}`}</h2>
          <p>{isEnglish ? 'Edit the annual budget from the card below, then allocate it across budget lines.' : 'عدّل ميزانية السنة من البطاقة الواضحة بالأسفل، ثم وزّعها على البنود.'}</p>
        </div>
        <label className="year-picker">
          <span>{isEnglish ? 'View Year' : 'عرض سنة'}</span>
          <select value={currentYear.year} onChange={(event) => setSelectedYear(event.target.value)}>{years.map((year) => <option key={year.year} value={year.year}>{year.year}</option>)}</select>
        </label>
      </div>

      <div className="budget-summary-grid">
        <div className="featured"><span>{isEnglish ? 'Annual Budget' : 'ميزانية السنة'}</span><strong>{formatMoney(currentYear.budget)}</strong></div>
        <div><span>{isEnglish ? 'Allocated to Lines' : 'الموزع على البنود'}</span><strong>{formatMoney(currentYear.allocated)}</strong></div>
        <div><span>{isEnglish ? 'Unallocated' : 'غير موزع'}</span><strong>{formatMoney(currentYear.unallocated)}</strong></div>
        <div><span>{isEnglish ? 'Consumed' : 'المستهلك'}</span><strong>{formatMoney(currentYear.consumed)}</strong></div>
        <div><span>{isEnglish ? 'Remaining' : 'المتبقي'}</span><strong>{formatMoney(currentYear.remaining)}</strong></div>
      </div>

      <div className="budget-workspace">
        <form className="budget-action-card year-budget-card" onSubmit={onUpdateYear}>
          <div>
            <span className="card-kicker">{isEnglish ? 'Edit Current Year Budget' : 'تعديل ميزانية السنة الحالية'}</span>
            <h3>{isEnglish ? `Budget ${currentYear.year}` : `ميزانية ${currentYear.year}`}</h3>
            <p>{isEnglish ? 'Enter the amount here and save. This is the budget shown on the dashboard.' : 'اكتب الرقم هنا واضغط حفظ. هذه هي الميزانية التي تظهر في لوحة التحكم.'}</p>
          </div>
          <label className="big-money-input">
            <span>{isEnglish ? `Budget Amount ${currentYear.year}` : `مبلغ ميزانية ${currentYear.year}`}</span>
            <input inputMode="decimal" value={formatMoneyInput(yearDraft.budget)} onChange={(event) => setYearDraft({ ...yearDraft, budget: formatMoneyInput(event.target.value) })} placeholder={isEnglish ? 'Example: 1,000,000' : 'مِثال: 1,000,000'} />
          </label>
          <button className="primary-action" disabled={disabled} type="submit">{isEnglish ? `Save Budget ${currentYear.year}` : `حفظ ميزانية ${currentYear.year}`}</button>
        </form>

        <form className="budget-action-card new-year-card" onSubmit={onCreateYear}>
          <div>
            <span className="card-kicker">{isEnglish ? 'Add New Fiscal Year' : 'إضافة سنة مالية جديدة'}</span>
            <h3>{isEnglish ? 'Independent Year' : 'سنة مستقلة'}</h3>
            <p>{isEnglish ? 'Enter the new year and its budget. Previous years will not be changed.' : 'اكتب السنة الجديدة وميزانيتها. لن يتم تغيير أرقام السنوات السابقة.'}</p>
          </div>
          <div className="new-year-inputs">
            <label>
              <span>{isEnglish ? 'New Year' : 'السنة الجديدة'}</span>
              <input value={yearDraft.year} onChange={(event) => setYearDraft({ ...yearDraft, year: event.target.value })} placeholder="2027" />
            </label>
            <label>
              <span>{isEnglish ? 'New Year Budget' : 'ميزانية السنة الجديدة'}</span>
              <input inputMode="decimal" value={formatMoneyInput(yearDraft.newBudget || '')} onChange={(event) => setYearDraft({ ...yearDraft, newBudget: formatMoneyInput(event.target.value) })} placeholder={isEnglish ? 'Example: 1,200,000' : 'مِثال: 1,200,000'} />
            </label>
          </div>
          <button className="ghost-action" disabled={disabled} type="submit">{isEnglish ? '+ Create Fiscal Year' : '+ إنشاء سنة مالية'}</button>
        </form>
      </div>

      <form className="budget-category-form" onSubmit={onCreateCategory}>
        <div className="category-form-heading">
          <span>{isEnglish ? `Add Line to Year ${currentYear.year}` : `إضافة بند على سنة ${currentYear.year}`}</span>
          <strong>{isEnglish ? 'Spending Lines' : 'بنود الصرف'}</strong>
        </div>
        <label><span>{isEnglish ? 'Line Name' : 'اسم البند'}</span><input placeholder={isEnglish ? 'Example: IT Equipment' : 'مِثال: أجهزة ومعدات'} required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /></label>
        <label><span>{isEnglish ? 'Allocated Amount' : 'المبلغ المخصص'}</span><input placeholder={isEnglish ? 'Example: 250,000' : 'مِثال: 250,000'} inputMode="decimal" required value={formatMoneyInput(categoryForm.allocatedAmount)} onChange={(event) => setCategoryForm({ ...categoryForm, allocatedAmount: formatMoneyInput(event.target.value) })} /></label>
        <button className="primary-action" type="submit" disabled={disabled}>{isEnglish ? '+ Add Line' : '+ إضافة بند'}</button>
      </form>

      <table className="orders-table budget-table">
        <thead><tr><th>{isEnglish ? 'Line' : 'البند'}</th><th>{isEnglish ? 'Allocated' : 'المخصص'}</th><th>{isEnglish ? 'Consumed' : 'المستهلك'}</th><th>{isEnglish ? 'Remaining' : 'المتبقي'}</th><th>{isEnglish ? 'Requests' : 'عدد الطلبات'}</th><th>{isEnglish ? 'Action' : 'إجراء'}</th></tr></thead>
        <tbody>{yearCategories.map((category) => (
          <tr key={category.id}>
            <td><input aria-label={isEnglish ? 'Budget line name' : 'اسم بند الميزانية'} value={categoryNameValue(category)} onChange={(event) => updateCategoryNameDraft(category.id, event.target.value)} onBlur={(event) => commitCategoryName(category, event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></td>
            <td><input aria-label={isEnglish ? 'Line allocated amount' : 'المبلغ المخصص للبند'} inputMode="decimal" value={formatMoneyInput(category.allocatedAmount)} onChange={(event) => onUpdateCategory(category.id, { allocatedAmount: formatMoneyInput(event.target.value) })} /></td>
            <td>{formatMoney(category.consumed)}</td>
            <td>{formatMoney(category.remaining)}</td>
            <td>{category.orderCount}</td>
            <td><button className="danger-action compact-action" type="button" disabled={disabled} onClick={() => onDeleteCategory(category)}>{isEnglish ? 'Delete Line' : 'مسح البند'}</button></td>
          </tr>
        ))}</tbody>
      </table>
      {yearCategories.length === 0 && <div className="empty-state">{isEnglish ? 'No budget lines for this year yet.' : 'لا توجد بنود لهذه السنة بعد.'}</div>}
    </article>
  )
}

function OrdersPanel({ title, orders, mode, quickFilter, setQuickFilter, handlers, archiveYears = [], formatMoney = formatCurrency }) {
  return (
    <article className="panel orders-panel">
      <div className="panel-header">
        <div><span>المتابعة اليومية</span><h2>{title} ({orders.length})</h2></div>
        {mode === 'active' && (
          <div className="filter-tabs">
            {['الكل', 'بانتظار LPO', 'قيد الدفع'].map((filter) => (
              <button className={quickFilter === filter ? 'active' : ''} onClick={() => setQuickFilter(filter)} type="button" key={filter}>{filter}</button>
            ))}
          </div>
        )}
      </div>
      <table className="orders-table">
        <thead><tr><th>الطلب</th><th>المورد</th><th>المسؤول</th><th>LPO</th><th>رقم الطلب</th><th>الحالة</th><th>الدفع / المتبقي</th><th>إجراء</th></tr></thead>
        <tbody>{orders.map((order) => <OrderRow key={order.id} order={order} mode={mode} archiveYears={archiveYears} formatMoney={formatMoney} {...handlers} />)}</tbody>
      </table>
      {orders.length === 0 && <div className="empty-state">لا توجد طلبات في هذا القسم.</div>}
    </article>
  )
}

function ArchivePanel({ orders, archiveYears, archiveYearFilter, setArchiveYearFilter, handlers, formatMoney = formatCurrency }) {
  const language = currentLanguage()
  const isEnglish = language === 'en'
  const filteredOrders = archiveYearFilter === 'الكل'
    ? orders
    : orders.filter((order) => archiveYearForOrder(order) === archiveYearFilter)
  const grouped = archiveYears
    .map((year) => ({ year, orders: filteredOrders.filter((order) => archiveYearForOrder(order) === year) }))
    .filter((group) => group.orders.length > 0)

  return (
    <article className="panel orders-panel archive-panel">
      <div className="panel-header archive-header">
        <div>
          <span>{isEnglish ? 'Archive by Request Creation Year' : 'الأرشيف حسب سنة إنشاء الطلب'}</span>
          <h2>{isEnglish ? `Archived Requests (${filteredOrders.length})` : `الطلبات المؤرشفة (${filteredOrders.length})`}</h2>
        </div>
        <div className="filter-tabs archive-year-tabs">
          <button className={archiveYearFilter === 'الكل' ? 'active' : ''} onClick={() => setArchiveYearFilter('الكل')} type="button">{isEnglish ? 'All' : 'الكل'}</button>
          {archiveYears.map((year) => (
            <button className={archiveYearFilter === year ? 'active' : ''} onClick={() => setArchiveYearFilter(year)} type="button" key={year}>{year}</button>
          ))}
        </div>
      </div>
      <p className="archive-help">{isEnglish ? 'The default year is based on request creation date. To move a request between years, change the archive year from its row.' : 'السنة الافتراضية مبنية على تاريخ إنشاء الطلب. إذا احتجت تنقل طلب بين السنوات، غيّر سنة الأرشيف من القائمة داخل صف الطلب.'}</p>
      {grouped.map((group) => (
        <section className="archive-year-group" key={group.year}>
          <div className="archive-year-heading"><strong>{group.year}</strong><span>{isEnglish ? `${group.orders.length} request(s)` : `${group.orders.length} طلب`}</span></div>
          <table className="orders-table">
            <thead><tr><th>{isEnglish ? 'Request' : 'الطلب'}</th><th>{isEnglish ? 'Supplier' : 'المورد'}</th><th>{isEnglish ? 'Owner' : 'المسؤول'}</th><th>LPO</th><th>{isEnglish ? 'Status' : 'الحالة'}</th><th>{isEnglish ? 'Payment / Remaining' : 'الدفع / المتبقي'}</th><th>{isEnglish ? 'Action' : 'إجراء'}</th></tr></thead>
            <tbody>{group.orders.map((order) => <OrderRow key={order.id} order={order} mode="archive" archiveYears={archiveYears} formatMoney={formatMoney} {...handlers} />)}</tbody>
          </table>
        </section>
      ))}
      {filteredOrders.length === 0 && <div className="empty-state">{isEnglish ? 'No archived requests match this filter.' : 'لا توجد طلبات مؤرشفة ضمن هذا التصفية.'}</div>}
    </article>
  )
}

function DepartmentBudgetCard({ years, selectedYear, setSelectedYear, formatMoney = formatCurrency }) {
  const currentYear = years.find((year) => String(year.year) === String(selectedYear)) || years[0] || { year: currentYearText(), budget: 0, consumed: 0, remaining: 0 }
  const isEnglish = currentLanguage() === 'en'
  return (
    <div className="hero-summary-card budget-summary-card annual-dashboard-card">
      <div className="annual-card-top">
        <span>{isEnglish ? 'Annual Budget' : 'ميزانية السنة'}</span>
        <label>
          <span>{isEnglish ? 'Year' : 'السنة'}</span>
          <select value={currentYear.year} onChange={(event) => setSelectedYear(event.target.value)}>
            {years.map((year) => <option key={year.year} value={year.year}>{year.year}</option>)}
          </select>
        </label>
      </div>
      <strong>{formatMoney(currentYear.budget)}</strong>
      <div><small>{isEnglish ? 'Consumed' : 'المستهلك'}</small><b>{formatMoney(currentYear.consumed)}</b></div>
      <div><small>{isEnglish ? 'Remaining' : 'المتبقي'}</small><b>{formatMoney(currentYear.remaining)}</b></div>
      <p>{isEnglish ? 'Edit the budget from the Budget Lines page.' : 'تعديل الميزانية من صفحة بنود الميزانية.'}</p>
    </div>
  )
}

function LoginGate({ loginPassword, setLoginPassword, onLogin, authStatus, loginError, isSaving, language = 'ar', setLanguage }) {
  const activeLanguage = language === 'en' ? 'en' : 'ar'
  return (
    <main className="auth-page" data-lang={activeLanguage} dir={activeLanguage === 'en' ? 'ltr' : 'rtl'}>
      <section className="auth-card">
        <div className="auth-card-top">
          <div>
            <div className="brand-mark">S</div>
            <span>SupplyDesk</span>
          </div>
          {setLanguage && <LanguageToggle language={activeLanguage} setLanguage={setLanguage} reloadOnChange />}
        </div>
        <h1>تسجيل الدخول</h1>
        <p>أدخل كلمة المرور لفتح البرنامج.</p>
        {authStatus.lockedUntil && <div className="auth-error">تم القفل مؤقتًا إلى: {new Date(authStatus.lockedUntil).toLocaleString('ar-QA')}</div>}
        {loginError && <div className="auth-error">{loginError}</div>}
        <form onSubmit={onLogin} className="auth-form">
          <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="كلمة المرور" autoFocus />
          <button className="primary-action" type="submit" disabled={isSaving}>تسجيل الدخول</button>
        </form>
        <small>بعد 3 محاولات خطأ يتم القفل حسب مدة إعدادات المسؤول.</small>
      </section>
    </main>
  )
}

function AdminSettingsPanel({ settingsDraft, setSettingsDraft, onSave, onTestEmail, onLogout, disabled, notice }) {
  return (
    <article className="panel admin-settings-panel full-panel">
      <div className="panel-header"><div><span>الحماية</span><h2>إعدادات المسؤول</h2></div></div>
      <div className="admin-settings-grid">
        <label className="toggle-row">
          <span>تفعيل كلمة المرور</span>
          <input type="checkbox" checked={settingsDraft.authEnabled} onChange={(event) => setSettingsDraft({ ...settingsDraft, authEnabled: event.target.checked })} />
        </label>
        <label>كلمة مرور جديدة<input type="password" value={settingsDraft.newPassword} onChange={(event) => setSettingsDraft({ ...settingsDraft, newPassword: event.target.value })} placeholder="اتركها فارغة إذا لم ترغب في تغييرها" /><small>{settingsDraft.passwordSet ? 'يوجد كلمة مرور محفوظة حاليًا.' : 'لا توجد كلمة مرور محفوظة؛ ضع كلمة قبل التفعيل.'}</small></label>
        <label>مدة القفل بالدقائق<input inputMode="numeric" value={settingsDraft.lockDurationMinutes} onChange={(event) => setSettingsDraft({ ...settingsDraft, lockDurationMinutes: event.target.value })} /></label>
        <label>العملة<select value={settingsDraft.currencyCode || 'QAR'} onChange={(event) => {
          const currency = currencyFromCode(event.target.value)
          setSettingsDraft({ ...settingsDraft, currencyCode: currency.code, currencySymbol: currency.symbol })
        }}>
          {currencyOptions.map((currency) => <option key={currency.code} value={currency.code}>{currentLanguage() === 'en' ? currency.labelEn : currency.labelAr}</option>)}
        </select>
          <small>{currentLanguage() === 'en' ? 'Choose the currency shown next to amounts across the dashboard, requests, and budget lines.' : 'اختر العملة التي تظهر بجانب كل المبالغ في لوحة التحكم والطلبات وبنود الميزانية.'}</small>
        </label>
        <label className="toggle-row">
          <span>إرسال إيميل عند إنشاء طلب جديد</span>
          <input type="checkbox" checked={settingsDraft.emailNotificationsEnabled} onChange={(event) => setSettingsDraft({ ...settingsDraft, emailNotificationsEnabled: event.target.checked })} />
        </label>
        <label className="email-recipient-field">إيميل مستلم الطلبات الجديدة<input type="email" value={settingsDraft.emailRecipient} onChange={(event) => setSettingsDraft({ ...settingsDraft, emailRecipient: event.target.value })} placeholder="procurement@company.local" /><small>يرسل البرنامج عبر Mail Relay الداخلي بدون يوزر أو باسورد.</small></label>
        <section className="email-theme-picker" aria-label="ثيم الإيميل">
          <div className="email-theme-heading">
            <div>
              <span>ثيم الإيميل</span>
              <strong>شكل رسالة Mail Relay</strong>
            </div>
            <small>اختر ثيم واضح حسب عميل البريد والشبكة المعزولة.</small>
          </div>
          <div className="email-theme-options">
            {emailThemeOptions.map((option) => (
              <label className={`email-theme-card ${settingsDraft.emailTheme === option.id ? 'active' : ''}`} key={option.id}>
                <input type="radio" name="emailTheme" value={option.id} checked={settingsDraft.emailTheme === option.id} onChange={(event) => setSettingsDraft({ ...settingsDraft, emailTheme: event.target.value })} />
                <span className="email-theme-swatches" aria-hidden="true">
                  {option.colors.map((color) => <i key={color} style={{ background: color }} />)}
                </span>
                <b>{currentLanguage() === 'en' ? option.nameEn : option.name}</b>
                <small>{currentLanguage() === 'en' ? option.hintEn : option.hint}</small>
              </label>
            ))}
          </div>
        </section>
        <div className="email-test-actions">
          <button className="ghost-action" type="button" onClick={onTestEmail} disabled={disabled || !settingsDraft.emailRecipient.trim()}>اختبار إرسال بريد</button>
          <small>يحفظ الإيميل الحالي ثم يرسل رسالة اختبار للمستلم.</small>
        </div>
        {notice && <div className={`admin-inline-message ${notice.type || 'success'}`}>{notice.message}</div>}
        <div className="admin-actions">
          <button className="primary-action" type="button" onClick={onSave} disabled={disabled}>حفظ إعدادات المسؤول</button>
          <button className="ghost-action" type="button" onClick={onLogout}>تسجيل الخروج</button>
        </div>
        <p className="admin-help">إذا كانت كلمة المرور مفعّلة، فإن إدخالها بشكل خاطئ 3 مرات يؤدي إلى قفل الدخول حسب المدة المحددة. تنبيهات الإيميل تستخدم Mail Relay الداخلي بعنوان مرسل مخفي من إعدادات السيرفر.</p>
      </div>
    </article>
  )
}

function VersionPanel({ isOpen, onClose }) {
  if (!isOpen) return null
  return (
    <div className="version-backdrop" role="dialog" aria-modal="true" aria-label="تحديثات الإصدار" onClick={onClose}>
      <section className="version-panel" onClick={(event) => event.stopPropagation()}>
        <div className="version-panel-header">
          <div>
            <span>SupplyDesk</span>
            <h2>الإصدار v{appVersion}</h2>
          </div>
          <button className="ghost-action" type="button" onClick={onClose}>إغلاق</button>
        </div>
        <div className="version-scroll" tabIndex={0} aria-label="سجل تحديثات الإصدارات">
          {changelog.map((item) => (
            <article className="version-entry" key={item.version}>
              <strong>v{item.version}</strong>
              <ul>
                {item.changes.map((change) => <li key={change}>{change}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState('light')
  const [language, setLanguage] = useState(() => localStorage.getItem('talabati-language') || 'en')
  const [orderList, setOrderList] = useState(seedOrders)
  const [archivedOrders, setArchivedOrders] = useState([])
  const [deletedOrders, setDeletedOrders] = useState([])
  const [supplierList, setSupplierList] = useState(seedSuppliers)
  const [budgetYears, setBudgetYears] = useState([])
  const [budgetCategories, setBudgetCategories] = useState([])
  const [selectedBudgetYear, setSelectedBudgetYear] = useState(currentYearText())
  const [budgetCategoryForm, setBudgetCategoryForm] = useState(emptyBudgetCategoryForm)
  const [budgetYearDraft, setBudgetYearDraft] = useState(emptyBudgetYearForm)
  const [activeSection, setActiveSection] = useState('لوحة التحكم')
  const [quickFilter, setQuickFilter] = useState('الكل')
  const [archiveYearFilter, setArchiveYearFilter] = useState('الكل')
  const [query, setQuery] = useState('')
  const [modalMode, setModalMode] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm)
  const [noteDraft, setNoteDraft] = useState('')
  const [detailDraft, setDetailDraft] = useState(emptyForm)
  const [heroTitle, setHeroTitle] = useState('إدارة طلبات المشتريات بوضوح وتحكّم')
  const [heroTitleDraft, setHeroTitleDraft] = useState('إدارة طلبات المشتريات بوضوح وتحكّم')
  const [departmentBudget, setDepartmentBudget] = useState('0')
  const [departmentBudgetDraft, setDepartmentBudgetDraft] = useState('0')
  const [authStatus, setAuthStatus] = useState({ authEnabled: false, authenticated: true, lockDurationMinutes: 60, lockedUntil: '' })
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [adminSettingsDraft, setAdminSettingsDraft] = useState({ authEnabled: false, lockDurationMinutes: '60', newPassword: '', passwordSet: false, currencyCode: 'QAR', currencySymbol: 'ر.ق', emailNotificationsEnabled: false, emailRecipient: '', emailTheme: 'talabati' })
  const [isEditingHeroTitle, setIsEditingHeroTitle] = useState(false)
  const [isVersionOpen, setIsVersionOpen] = useState(false)
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [uiNotice, setUiNotice] = useState(null)
  const [hiddenSuggestions, setHiddenSuggestions] = useState(emptyHiddenSuggestions)

  const refreshData = async () => {
    const [orders, archived, deleted, suppliers, settings, years, categories] = await Promise.all([
      fetchOrdersApi(),
      fetchOrdersApi(fetch, 'archived'),
      fetchOrdersApi(fetch, 'deleted'),
      fetchSuppliersApi(),
      fetchSettingsApi(),
      fetchBudgetYearsApi(),
      fetchBudgetCategoriesApi(),
    ])
    setOrderList(orders)
    setArchivedOrders(archived)
    setDeletedOrders(deleted)
    setSupplierList(suppliers)
    setBudgetYears(years)
    setBudgetCategories(categories)
    const defaultBudgetYear = years[0]?.year || currentYearText()
    setSelectedBudgetYear((current) => years.some((year) => String(year.year) === String(current)) ? current : defaultBudgetYear)
    const activeBudgetYear = years.find((year) => String(year.year) === String(defaultBudgetYear)) || years[0]
    if (activeBudgetYear) setBudgetYearDraft({ year: String(Number(activeBudgetYear.year) + 1), budget: formatMoneyInput(activeBudgetYear.budget || ''), newBudget: '', notes: activeBudgetYear.notes || '' })
    setHeroTitle(settings.heroTitle || heroTitle)
    setHeroTitleDraft(settings.heroTitle || heroTitle)
    setDepartmentBudget(settings.departmentBudget || '0')
    setDepartmentBudgetDraft(settings.departmentBudget || '0')
    setHiddenSuggestions(parseHiddenSuggestions(settings.hiddenSuggestions))
    setAdminSettingsDraft({
      authEnabled: String(settings.authEnabled).toLowerCase() === 'true',
      lockDurationMinutes: settings.lockDurationMinutes || '60',
      newPassword: '',
      passwordSet: Boolean(settings.passwordSet),
      currencyCode: settings.currencyCode || 'QAR',
      currencySymbol: settings.currencySymbol || 'ر.ق',
      emailNotificationsEnabled: String(settings.emailNotificationsEnabled).toLowerCase() === 'true',
      emailRecipient: settings.emailRecipient || '',
      emailTheme: settings.emailTheme || 'talabati',
    })
  }

  useEffect(() => {
    let cancelled = false
    fetchAuthStatusApi()
      .then((status) => {
        if (cancelled) return
        setAuthStatus(status)
        if (status.authenticated) {
          return refreshData().then(() => { if (!cancelled) setApiError('') })
        }
        return undefined
      })
      .catch(() => { if (!cancelled) setApiError('تعذر التحقق من حالة الدخول.') })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!uiNotice) return undefined
    const timeout = setTimeout(() => setUiNotice(null), 4500)
    return () => clearTimeout(timeout)
  }, [uiNotice])

  const showNotice = (message, type = 'success') => setUiNotice({ message, type, id: Date.now() })

  const visibleOrders = useMemo(() => filterOrders(orderList, { section: activeSection, quickFilter, query }), [orderList, activeSection, quickFilter, query])
  const visibleArchived = useMemo(() => filterOrders(archivedOrders, { section: 'الطلبات', quickFilter: 'الكل', query }), [archivedOrders, query])
  const archiveYears = useMemo(() => archiveYearOptions(visibleArchived), [visibleArchived])
  const visibleDeleted = useMemo(() => filterOrders(deletedOrders, { section: 'الطلبات', quickFilter: 'الكل', query }), [deletedOrders, query])
  const stats = useMemo(() => dashboardStats(orderList), [orderList])
  const totalValue = useMemo(() => orderList.reduce((sum, order) => sum + Number(order.amount || 0), 0), [orderList])
  const paidValue = useMemo(() => orderList.reduce((sum, order) => sum + paymentSummary(order.payments).paid, 0), [orderList])
  const formatMoney = useMemo(() => (value) => formatCurrency(value, currencySymbolFromSettings(adminSettingsDraft)), [adminSettingsDraft.currencySymbol, adminSettingsDraft.currencyCode])
  const allOrdersForDetails = [...orderList, ...archivedOrders, ...deletedOrders]
  const selectedOrder = useMemo(() => allOrdersForDetails.find((order) => order.id === selectedOrderId) || null, [allOrdersForDetails, selectedOrderId])
  const titleSuggestions = useMemo(() => filterHiddenSuggestions(uniqueSuggestions(allOrdersForDetails.map((order) => order.title)), hiddenSuggestions.title), [allOrdersForDetails, hiddenSuggestions.title])
  const supplierSuggestions = useMemo(() => filterHiddenSuggestions(uniqueSuggestions([...supplierList.map((supplier) => supplier.name), ...allOrdersForDetails.map((order) => order.supplier)]), hiddenSuggestions.supplier), [supplierList, allOrdersForDetails, hiddenSuggestions.supplier])
  const ownerSuggestions = useMemo(() => filterHiddenSuggestions(uniqueSuggestions(allOrdersForDetails.flatMap((order) => order.owners || [])), hiddenSuggestions.owner), [allOrdersForDetails, hiddenSuggestions.owner])
  const requesterSuggestions = useMemo(() => filterHiddenSuggestions(uniqueSuggestions(allOrdersForDetails.map((order) => order.requester)), hiddenSuggestions.requester), [allOrdersForDetails, hiddenSuggestions.requester])

  useEffect(() => {
    if (selectedOrder) {
      setNoteDraft((selectedOrder.updates || []).join('\n'))
      setDetailDraft({
        ...emptyForm,
        title: selectedOrder.title || '',
        supplier: selectedOrder.supplier || '',
        owner: (selectedOrder.owners || []).join('\n'),
        lpo: selectedOrder.lpo || '',
        requestNumber: selectedOrder.requestNumber || '',
        requester: selectedOrder.requester || '',
        paymentNumber: selectedOrder.paymentNumber || '',
        budgetYear: selectedOrder.budgetYear || selectedBudgetYear || currentYearText(),
        budgetCategoryId: selectedOrder.budgetCategoryId || '',
        amount: formatMoneyInput(selectedOrder.amount || ''),
        priority: selectedOrder.priority || 'عادي',
        status: selectedOrder.status || 'طلب جديد',
        expectedDate: selectedOrder.expectedDate || '',
      })
    }
  }, [selectedOrderId, selectedOrder?.updatedAt])

  const replaceOrderInState = (savedOrder) => {
    setOrderList((current) => current.map((order) => order.id === savedOrder.id ? savedOrder : order))
    setArchivedOrders((current) => current.map((order) => order.id === savedOrder.id ? savedOrder : order))
    setDeletedOrders((current) => current.map((order) => order.id === savedOrder.id ? savedOrder : order))
  }

  const openNewOrder = () => { setEditingId(null); setForm({ ...emptyForm, budgetYear: selectedBudgetYear || currentYearText() }); setModalMode('new') }
  const openEditOrder = (order) => {
    setEditingId(order.id)
    setForm({
      ...emptyForm,
      title: order.title || '',
      supplier: order.supplier || '',
      owner: (order.owners || []).join('\n'),
      lpo: order.lpo || '',
      requestNumber: order.requestNumber || '',
      requester: order.requester || '',
      paymentNumber: order.paymentNumber || '',
      budgetYear: order.budgetYear || selectedBudgetYear || currentYearText(),
      budgetCategoryId: order.budgetCategoryId || '',
      amount: String(order.amount || ''),
      priority: order.priority || 'عادي',
      status: order.status || 'طلب جديد',
      expectedDate: order.expectedDate || '',
      notes: '',
    })
    setModalMode('edit')
  }


  const refreshBudgetData = async () => {
    const [years, categories] = await Promise.all([fetchBudgetYearsApi(), fetchBudgetCategoriesApi()])
    setBudgetYears(years)
    setBudgetCategories(categories)
  }

  const withSaving = async (work, errorMessage) => {
    setIsSaving(true)
    setApiError('')
    try { await work() } catch { setApiError(errorMessage) } finally { setIsSaving(false) }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setLoginError('')
    try {
      await loginApi(loginPassword)
      const status = await fetchAuthStatusApi()
      setAuthStatus(status)
      setLoginPassword('')
      await refreshData()
    } catch (error) {
      const status = await fetchAuthStatusApi().catch(() => authStatus)
      setAuthStatus(status)
      setLoginError(status.lockedUntil ? 'تم قفل الدخول مؤقتًا بعد 3 محاولات خطأ.' : 'كلمة المرور غير صحيحة.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    await logoutApi().catch(() => {})
    const status = await fetchAuthStatusApi().catch(() => ({ authEnabled: true, authenticated: false, lockDurationMinutes: 60, lockedUntil: '' }))
    setAuthStatus(status)
    if (status.authEnabled && !status.authenticated) setActiveSection('لوحة التحكم')
  }

  const revealSavedOrderSuggestions = async (savedOrder) => {
    const next = removeValuesFromHiddenSuggestions(hiddenSuggestions, orderSuggestionValues(savedOrder))
    if (hiddenSuggestionsEqual(hiddenSuggestions, next)) return
    setHiddenSuggestions(next)
    await updateSettingsApi({ hiddenSuggestions: JSON.stringify(next) })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await withSaving(async () => {
      if (modalMode === 'edit') {
        const savedOrder = await updateOrderApi(editingId, form)
        replaceOrderInState(savedOrder)
        await revealSavedOrderSuggestions(savedOrder)
        await refreshBudgetData()
      }
      else {
        const createResult = await createOrderApi(form)
        const savedOrder = createResult.order || createResult
        setOrderList((current) => [savedOrder, ...current])
        await revealSavedOrderSuggestions(savedOrder)
        await refreshBudgetData()
        if (createResult.emailNotification?.sent) showNotice('تم إنشاء الطلب وإرسال تنبيه الإيميل.', 'success')
        else if (createResult.emailNotification?.error) showNotice('تم إنشاء الطلب، لكن تنبيه الإيميل لم يرسل. راجع Mail Relay.', 'warning')
      }
      setModalMode(null); setEditingId(null); setForm(emptyForm)
    }, 'تعذر حفظ الطلب. حاول مرة أخرى.')
  }

  const handleQuickUpdate = async (orderId, patch, { sync = true } = {}) => {
    setOrderList((current) => updateOrder(current, orderId, patch))
    if (!sync) return
    await withSaving(async () => replaceOrderInState(await updateOrderApi(orderId, patch)), 'تعذر حفظ التعديل. حاول مرة أخرى.')
  }

  const handleAddPayment = async (orderId) => withSaving(async () => {
    replaceOrderInState(await addPaymentApi(orderId, paymentForm))
    setPaymentForm(emptyPaymentForm)
  }, 'تعذر إضافة الدفعة. حاول مرة أخرى.')

  const handleUpdatePayment = async (orderId, paymentId, patch) => withSaving(async () => {
    replaceOrderInState(await updatePaymentApi(orderId, paymentId, patch))
  }, 'تعذر تحديث الدفعة. حاول مرة أخرى.')

  const handleDeletePayment = async (orderId, paymentId) => withSaving(async () => {
    replaceOrderInState(await deletePaymentApi(orderId, paymentId))
  }, 'تعذر حذف الدفعة. حاول مرة أخرى.')

  const handleSaveOrderChanges = async (orderId) => withSaving(async () => {
    const { payments: _payments, paymentCount: _paymentCount, notes: _notes, ...detailsPatch } = detailDraft
    const updates = noteDraft.split('\n').map((line) => line.trim()).filter(Boolean)
    const savedOrder = await updateOrderApi(orderId, { ...detailsPatch, updates })
    replaceOrderInState(savedOrder)
    await revealSavedOrderSuggestions(savedOrder)
    await refreshBudgetData()
    setSelectedOrderId(null)
    setActiveSection('لوحة التحكم')
  }, 'تعذر حفظ التغييرات. حاول مرة أخرى.')

  const handleDeleteSuggestion = async (group, value) => {
    const normalized = normalizeSuggestionText(value)
    if (!suggestionGroups.includes(group) || !normalized) return
    const next = {
      ...hiddenSuggestions,
      [group]: uniqueSuggestions([...(hiddenSuggestions[group] || []), normalized]),
    }
    setHiddenSuggestions(next)
    setApiError('')
    try {
      await updateSettingsApi({ hiddenSuggestions: JSON.stringify(next) })
    } catch {
      setHiddenSuggestions(hiddenSuggestions)
      setApiError('تعذر مسح الاقتراح. حاول مرة ثانية.')
    }
  }

  const handleSaveHeroTitle = async () => withSaving(async () => {
    const settings = await updateSettingsApi({ heroTitle: heroTitleDraft })
    setHeroTitle(settings.heroTitle || heroTitleDraft)
    setHeroTitleDraft(settings.heroTitle || heroTitleDraft)
    setIsEditingHeroTitle(false)
  }, 'تعذر حفظ عنوان الواجهة. حاول مرة أخرى.')

  const handleCreateBudgetYear = async (event) => {
    event.preventDefault()
    await withSaving(async () => {
      const year = await createBudgetYearApi({ year: budgetYearDraft.year, budget: parseMoneyInput(budgetYearDraft.newBudget || budgetYearDraft.budget), notes: budgetYearDraft.notes || '' })
      setBudgetYears((current) => [year, ...current.filter((item) => item.year !== year.year)].sort((a, b) => Number(b.year) - Number(a.year)))
      setSelectedBudgetYear(year.year)
      setBudgetYearDraft({ ...emptyBudgetYearForm, year: String(Number(year.year) + 1), budget: formatMoneyInput(year.budget || ''), newBudget: '', notes: year.notes || '' })
    }, 'تعذر إنشاء السنة المالية. حاول مرة أخرى.')
  }

  const handleUpdateBudgetYear = async (event) => {
    event.preventDefault()
    await withSaving(async () => {
      const year = await updateBudgetYearApi(selectedBudgetYear, { budget: parseMoneyInput(budgetYearDraft.budget), notes: budgetYearDraft.notes || '' })
      setBudgetYears((current) => current.map((item) => item.year === year.year ? year : item))
    }, 'تعذر حفظ ميزانية السنة. حاول مرة أخرى.')
  }

  const handleCreateBudgetCategory = async (event) => {
    event.preventDefault()
    await withSaving(async () => {
      await createBudgetCategoryApi({ ...budgetCategoryForm, year: selectedBudgetYear, allocatedAmount: parseMoneyInput(budgetCategoryForm.allocatedAmount) })
      const [years, categories] = await Promise.all([fetchBudgetYearsApi(), fetchBudgetCategoriesApi()])
      setBudgetYears(years)
      setBudgetCategories(categories)
      setBudgetCategoryForm(emptyBudgetCategoryForm)
    }, 'تعذر إضافة بند الميزانية. تأكد أن الاسم غير مكرر.')
  }

  const handleUpdateBudgetCategory = async (categoryId, patch) => {
    setBudgetCategories((current) => current.map((category) => category.id === categoryId ? { ...category, ...patch, allocatedAmount: patch.allocatedAmount === undefined ? category.allocatedAmount : patch.allocatedAmount } : category))
    await withSaving(async () => {
      await updateBudgetCategoryApi(categoryId, patch.allocatedAmount === undefined ? patch : { ...patch, allocatedAmount: parseMoneyInput(patch.allocatedAmount) })
      const [years, categories] = await Promise.all([fetchBudgetYearsApi(), fetchBudgetCategoriesApi()])
      setBudgetYears(years)
      setBudgetCategories(categories)
    }, 'تعذر حفظ بند الميزانية. حاول مرة أخرى.')
  }

  const handleDeleteBudgetCategory = async (category) => {
    if (!category?.id) return
    if (!confirm(`مسح بند الميزانية: ${category.name}؟

لا يمكن مسح البند إذا كان مرتبطًا بطلبات نشطة.`)) return
    await withSaving(async () => {
      await deleteBudgetCategoryApi(category.id)
      const [years, categories] = await Promise.all([fetchBudgetYearsApi(), fetchBudgetCategoriesApi()])
      setBudgetYears(years)
      setBudgetCategories(categories)
    }, 'تعذر مسح بند الميزانية. إذا كان مرتبطًا بطلبات، انقل الطلبات إلى بند آخر أولًا.')
  }

  const buildAdminSettingsPayload = () => {
    const payload = {
      authEnabled: String(Boolean(adminSettingsDraft.authEnabled)),
      lockDurationMinutes: String(Math.max(1, Number(adminSettingsDraft.lockDurationMinutes) || 60)),
      currencyCode: currencyFromCode(adminSettingsDraft.currencyCode).code,
      currencySymbol: currencyFromCode(adminSettingsDraft.currencyCode).symbol,
      emailNotificationsEnabled: String(Boolean(adminSettingsDraft.emailNotificationsEnabled)),
      emailRecipient: adminSettingsDraft.emailRecipient.trim(),
      emailTheme: emailThemeOptions.some((option) => option.id === adminSettingsDraft.emailTheme) ? adminSettingsDraft.emailTheme : 'talabati',
    }
    if (adminSettingsDraft.authEnabled && !adminSettingsDraft.passwordSet && !adminSettingsDraft.newPassword.trim()) {
      throw new Error('Password required before enabling auth')
    }
    if (adminSettingsDraft.newPassword.trim()) payload.newPassword = adminSettingsDraft.newPassword.trim()
    return payload
  }

  const applyAdminSettingsResponse = (settings, fallbackPayload) => {
    setAdminSettingsDraft({
      authEnabled: String(settings.authEnabled).toLowerCase() === 'true',
      lockDurationMinutes: settings.lockDurationMinutes || fallbackPayload.lockDurationMinutes,
      newPassword: '',
      passwordSet: Boolean(settings.passwordSet),
      currencyCode: settings.currencyCode || fallbackPayload.currencyCode,
      currencySymbol: settings.currencySymbol || currencyFromCode(settings.currencyCode || fallbackPayload.currencyCode).symbol,
      emailNotificationsEnabled: String(settings.emailNotificationsEnabled).toLowerCase() === 'true',
      emailRecipient: settings.emailRecipient || '',
      emailTheme: settings.emailTheme || 'talabati',
    })
  }

  const handleSaveAdminSettings = async () => withSaving(async () => {
    const payload = buildAdminSettingsPayload()
    const settings = await updateSettingsApi(payload)
    applyAdminSettingsResponse(settings, payload)
    const status = await fetchAuthStatusApi()
    setAuthStatus(status)
    showNotice('تم حفظ إعدادات المسؤول بنجاح.', 'success')
  }, 'تعذر حفظ إعدادات المسؤول. حاول مرة أخرى.')

  const handleTestAdminEmail = async () => {
    if (!adminSettingsDraft.emailRecipient.trim()) {
      showNotice('اكتب إيميل مستلم الطلبات الجديدة قبل اختبار الإرسال.', 'warning')
      return
    }
    setIsSaving(true)
    setApiError('')
    try {
      const payload = buildAdminSettingsPayload()
      const settings = await updateSettingsApi(payload)
      applyAdminSettingsResponse(settings, payload)
      const result = await sendTestEmailApi()
      if (result.sent) showNotice(`تم إرسال رسالة اختبار إلى ${result.to}.`, 'success')
      else showNotice('لم يتم إرسال رسالة الاختبار. تأكد من إعدادات البريد.', 'warning')
    } catch {
      showNotice('فشل اختبار البريد. راجع Mail Relay والإيميل المكتوب.', 'warning')
      setApiError('تعذر إرسال رسالة الاختبار. راجع إعدادات Mail Relay أو الإيميل.')
    } finally {
      setIsSaving(false)
    }
  }


  const handleArchive = async (orderId) => withSaving(async () => {
    const saved = await archiveOrderApi(orderId)
    setOrderList((current) => current.filter((order) => order.id !== orderId))
    setArchivedOrders((current) => [saved, ...current.filter((order) => order.id !== orderId)])
    setArchiveYearFilter((current) => current === 'الكل' ? current : saved.archiveYear || current)
    await refreshBudgetData()
  }, 'تعذر أرشفة الطلب. حاول مرة أخرى.')

  const handleArchiveYearChange = async (orderId, archiveYear) => withSaving(async () => {
    replaceOrderInState(await updateOrderApi(orderId, { archiveYear }))
  }, 'تعذر تغيير سنة الأرشيف. حاول مرة أخرى.')

  const handleTrash = async (orderId) => withSaving(async () => {
    const saved = await trashOrderApi(orderId)
    setOrderList((current) => current.filter((order) => order.id !== orderId))
    setArchivedOrders((current) => current.filter((order) => order.id !== orderId))
    setDeletedOrders((current) => [saved, ...current.filter((order) => order.id !== orderId)])
    await refreshBudgetData()
  }, 'تعذر مسح الطلب. حاول مرة أخرى.')

  const handleRestore = async (orderId) => withSaving(async () => {
    const saved = await restoreOrderApi(orderId)
    setOrderList((current) => [saved, ...current.filter((order) => order.id !== orderId)])
    setArchivedOrders((current) => current.filter((order) => order.id !== orderId))
    setDeletedOrders((current) => current.filter((order) => order.id !== orderId))
  }, 'تعذر استرجاع الطلب. حاول مرة أخرى.')

  const handleDeleteForever = async (orderId) => withSaving(async () => {
    await deleteOrderForeverApi(orderId)
    setDeletedOrders((current) => current.filter((order) => order.id !== orderId))
    await refreshBudgetData()
    if (selectedOrderId === orderId) setSelectedOrderId(null)
  }, 'تعذر الحذف النهائي. حاول مرة أخرى.')

  const openDetails = (orderId) => { setSelectedOrderId(orderId); setPaymentForm(emptyPaymentForm) }
  useEffect(() => {
    const handleDetailsClick = (event) => {
      const target = event.target.closest?.('[data-details-id]')
      if (!target) return
      openDetails(target.dataset.detailsId)
    }
    document.addEventListener('click', handleDetailsClick)
    return () => document.removeEventListener('click', handleDetailsClick)
  }, [])

  const handleUpdateSupplier = async (supplierId, patch) => {
    setSupplierList((current) => current.map((supplier) => supplier.id === supplierId ? { ...supplier, ...patch } : supplier))
    await withSaving(async () => {
      const savedSupplier = await updateSupplierApi(supplierId, patch)
      setSupplierList((current) => current.map((supplier) => supplier.id === supplierId ? savedSupplier : supplier))
    }, 'تعذر حفظ المورد. حاول مرة أخرى.')
  }

  const handleCreateSupplier = async (event) => {
    event.preventDefault()
    await withSaving(async () => {
      const savedSupplier = await createSupplierApi(supplierForm)
      setSupplierList((current) => [...current, savedSupplier])
      setSupplierForm(emptySupplierForm)
    }, 'تعذر إضافة المورد. تأكد أن الاسم غير مكرر.')
  }

  const handleDeleteSupplier = async (supplier) => {
    if (!supplier?.id) return
    if (!confirm(`حذف المورد؟\n\n${supplier.name}\n\nلا يمكن مسح المورد إذا كنت تحتاج بياناته لاحقًا. الطلبات السابقة لن تُحذف.`)) return
    await withSaving(async () => {
      await deleteSupplierApi(supplier.id)
      setSupplierList((current) => current.filter((item) => item.id !== supplier.id))
      showNotice('تم حذف المورد.', 'success')
    }, 'تعذر حذف المورد. حاول مرة أخرى.')
  }

  const selectSupplier = (supplier) => { const supplierName = typeof supplier === 'string' ? supplier : supplier?.name; setActiveSection('الطلبات'); setQuickFilter('الكل'); setQuery(supplierName || '') }
  const handlers = { onOpenDetails: openDetails, onArchive: handleArchive, onTrash: handleTrash, onRestore: handleRestore, onDeleteForever: handleDeleteForever, onArchiveYearChange: handleArchiveYearChange }

  const renderMainPanel = () => {
    if (activeSection === 'الموردون') {
      return <SuppliersPanel suppliers={supplierList} supplierForm={supplierForm} setSupplierForm={setSupplierForm} onCreateSupplier={handleCreateSupplier} onUpdateSupplier={handleUpdateSupplier} onDeleteSupplier={handleDeleteSupplier} onFocusOrders={selectSupplier} disabled={isSaving} />
    }
    if (activeSection === 'بنود الميزانية') return <BudgetCategoriesPanel years={budgetYears} categories={budgetCategories} formatMoney={formatMoney} selectedYear={selectedBudgetYear} setSelectedYear={(year) => { setSelectedBudgetYear(year); const found = budgetYears.find((item) => item.year === year); if (found) setBudgetYearDraft({ ...budgetYearDraft, year: String(Number(found.year) + 1), budget: formatMoneyInput(found.budget || ''), notes: found.notes || '' }) }} yearDraft={budgetYearDraft} setYearDraft={setBudgetYearDraft} categoryForm={budgetCategoryForm} setCategoryForm={setBudgetCategoryForm} onCreateYear={handleCreateBudgetYear} onUpdateYear={handleUpdateBudgetYear} onCreateCategory={handleCreateBudgetCategory} onUpdateCategory={handleUpdateBudgetCategory} onDeleteCategory={handleDeleteBudgetCategory} disabled={isSaving} />
    if (activeSection === 'إعدادات المسؤول') return <AdminSettingsPanel settingsDraft={adminSettingsDraft} setSettingsDraft={setAdminSettingsDraft} onSave={handleSaveAdminSettings} onTestEmail={handleTestAdminEmail} onLogout={handleLogout} disabled={isSaving} notice={uiNotice} />
    if (activeSection === 'الأرشيف') return <ArchivePanel orders={visibleArchived} archiveYears={archiveYears} archiveYearFilter={archiveYearFilter} setArchiveYearFilter={setArchiveYearFilter} handlers={handlers} formatMoney={formatMoney} />
    if (activeSection === 'المحذوفات') return <OrdersPanel title="سلة المحذوفات - يمكن الاسترجاع خلال 30 يوم" orders={visibleDeleted} mode="trash" quickFilter={quickFilter} setQuickFilter={setQuickFilter} handlers={handlers} formatMoney={formatMoney} />
    return <OrdersPanel title={activeSection === 'الدفعات' ? 'طلبات الدفعات' : 'طلبات المشتريات'} orders={visibleOrders} mode="active" quickFilter={quickFilter} setQuickFilter={setQuickFilter} handlers={handlers} formatMoney={formatMoney} />
  }

  useEffect(() => {
    const nextLanguage = language === 'en' ? 'en' : 'ar'
    localStorage.setItem('talabati-language', nextLanguage)
    document.documentElement.lang = nextLanguage
    document.documentElement.dir = nextLanguage === 'en' ? 'ltr' : 'rtl'
    document.documentElement.dataset.talabatiLanguage = nextLanguage
    translateDom(document.getElementById('root'), nextLanguage)
    if (nextLanguage !== 'en') return undefined
    const observer = new MutationObserver(() => translateDom(document.getElementById('root'), nextLanguage))
    const root = document.getElementById('root')
    if (root) observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [language, orderList, archivedOrders, deletedOrders, budgetYears, budgetCategories, activeSection, selectedOrderId, modalMode, isVersionOpen, apiError, isLoading, isSaving, uiNotice])

  if (!isLoading && authStatus.authEnabled && !authStatus.authenticated) {
    return <LoginGate loginPassword={loginPassword} setLoginPassword={setLoginPassword} onLogin={handleLogin} authStatus={authStatus} loginError={loginError} isSaving={isSaving} language={language} setLanguage={setLanguage} />
  }

  return (
    <main className="desktop-app" data-theme={theme} data-lang={language} dir={language === 'en' ? 'ltr' : 'rtl'}>
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <section className="workspace">
        <header className="topbar">
          <div className="page-kicker">{activeSection}</div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث في الطلبات، أوامر الشراء، الموردين، المسؤولين..." /></label>
            <LanguageToggle language={language} setLanguage={setLanguage} reloadOnChange />
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <button className="primary-action" type="button" onClick={openNewOrder} disabled={isSaving}>+ طلب جديد</button>
          </div>
        </header>

        {(apiError || isLoading || isSaving || uiNotice) && (
          <div className={`sync-banner ${apiError ? 'error' : uiNotice?.type || ''}`}>{apiError || uiNotice?.message || (isLoading ? 'جاري تحميل بيانات الطلبات...' : 'جاري حفظ البيانات...')}</div>
        )}

        <section className="executive-hero compact-hero">
          <div className="hero-title-editor">
            {isEditingHeroTitle ? (
              <>
                <textarea value={heroTitleDraft} onChange={(event) => setHeroTitleDraft(event.target.value)} />
                <div className="hero-title-actions">
                  <button className="primary-action" type="button" onClick={handleSaveHeroTitle}>حفظ العنوان</button>
                  <button className="ghost-action" type="button" onClick={() => { setHeroTitleDraft(heroTitle); setIsEditingHeroTitle(false) }}>{isEnglish ? 'Cancel' : 'إلغاء'}</button>
                </div>
              </>
            ) : (
              <>
                <h1>{heroTitle}</h1>
                <button className="ghost-action" type="button" onClick={() => setIsEditingHeroTitle(true)}>تعديل العنوان</button>
              </>
            )}
          </div>
          <div className="hero-finance-cards">
            <div className="hero-summary-card"><span>إجمالي قيمة الطلبات النشطة</span><strong>{formatMoney(totalValue)}</strong><div><small>المدفوع</small><b>{formatMoney(paidValue)}</b></div></div>
            <DepartmentBudgetCard
              years={budgetYears}
              formatMoney={formatMoney}
              selectedYear={selectedBudgetYear}
              setSelectedYear={(year) => {
                setSelectedBudgetYear(year)
                const found = budgetYears.find((item) => item.year === year)
                if (found) setBudgetYearDraft({ ...budgetYearDraft, year: String(Number(found.year) + 1), budget: formatMoneyInput(found.budget || ''), newBudget: '', notes: '' })
              }}
            />
          </div>
        </section>

        <section className="metrics-grid">
          <MetricCard icon={FileText} label="إجمالي الطلبات" value={stats.total} hint="طلبات نشطة" />
          <MetricCard icon={Clock3} label="قيد الإجراء" value={stats.active} hint="غير مكتملة" tone="info" />
          <MetricCard icon={CreditCard} label="مدفوعة جزئيًا" value={stats.partialPayments} hint="تحتاج متابعة مالية" tone="warning" />
          <MetricCard icon={Archive} label="الأرشيف" value={archivedOrders.length} hint="طلبات محفوظة خارج النشط" tone="success" />
          <MetricCard icon={Trash2} label="المحذوفات" value={deletedOrders.length} hint="قابلة للاسترجاع أو الحذف النهائي" tone="danger" />
        </section>

        {activeSection !== 'لوحة التحكم' && (
          <section className="section-brief panel">
            <strong>{activeSection}</strong>
            {activeSection === 'بنود الميزانية' && <span>أنشئ سنة مالية مستقلة، ثم وزع ميزانيتها على بنود مثل شراء الأدوات أو الصيانة واربط الطلبات بها.</span>}
            {activeSection === 'الأرشيف' && <span>الأرشيف مرتب حسب سنة إنشاء الطلب، ويمكنك تغيير سنة أي طلب يدويًا عند الحاجة إلى نقله بين السنوات.</span>}
            {activeSection === 'المحذوفات' && <span>تظهر هنا الطلبات المحذوفة فقط. يمكنك استرجاعها أو حذفها نهائيًا فورًا دون انتظار.</span>}
            {activeSection === 'الدفعات' && <span>افتح تفاصيل الطلب لتعديل الدفعات ومبالغها وحالتها.</span>}
            {activeSection === 'الطلبات' && <span>التعديل مباشر من الجدول، والمسؤولون يظهرون تحت بعض إذا كانوا أكثر من شخص.</span>}
            {activeSection === 'الموردون' && <span>إدارة الموردين محفوظة في قاعدة البيانات، بدون بطاقة جانبية تستهلك مساحة.</span>}
            {activeSection === 'التقارير' && <span>ملخص مباشر: {stats.total} طلب نشط، {archivedOrders.length} مؤرشف، {deletedOrders.length} في المحذوفات.</span>}
            {activeSection === 'الإعدادات' && <span>يمكنك تغيير المظهر واستخدام البحث العام. سنضيف الإعدادات المتقدمة بعد اعتماد الصلاحيات.</span>}
            {activeSection === 'إعدادات المسؤول' && <span>يمكنك تفعيل كلمة المرور أو إيقافها، وتغييرها، وتحديد مدة القفل بعد 3 محاولات خاطئة.</span>}
          </section>
        )}

        <section className="dashboard-grid">{renderMainPanel()}</section>
      </section>

      {modalMode && <OrderFormModal mode={modalMode} form={form} setForm={setForm} budgetYears={budgetYears} budgetCategories={budgetCategories} titleSuggestions={titleSuggestions} supplierSuggestions={supplierSuggestions} ownerSuggestions={ownerSuggestions} requesterSuggestions={requesterSuggestions} onDeleteSuggestion={handleDeleteSuggestion} onClose={() => setModalMode(null)} onSubmit={handleSubmit} />}
      {selectedOrder && (
        <OrderDetailsPanel
          order={selectedOrder}
          formatMoney={formatMoney}
          detailDraft={detailDraft}
          setDetailDraft={setDetailDraft}
          paymentForm={paymentForm}
          setPaymentForm={setPaymentForm}
          noteDraft={noteDraft}
          setNoteDraft={setNoteDraft}
          budgetYears={budgetYears}
          budgetCategories={budgetCategories}
          titleSuggestions={titleSuggestions}
          supplierSuggestions={supplierSuggestions}
          ownerSuggestions={ownerSuggestions}
          requesterSuggestions={requesterSuggestions}
          onDeleteSuggestion={handleDeleteSuggestion}
          onClose={() => setSelectedOrderId(null)}
          onAddPayment={handleAddPayment}
          onUpdatePayment={handleUpdatePayment}
          onDeletePayment={handleDeletePayment}
          onSaveOrderChanges={handleSaveOrderChanges}
        />
      )}
      <button className="version-button" type="button" onClick={() => setIsVersionOpen(true)}>v{appVersion}</button>
      <VersionPanel isOpen={isVersionOpen} onClose={() => setIsVersionOpen(false)} />
    </main>
  )
}
